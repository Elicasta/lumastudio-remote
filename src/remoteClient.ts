import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  REMOTE_PROTOCOL_VERSION,
  type RemoteCommand,
  type StudioState
} from "./protocol";
import { supabase } from "./supabase";

export type ConnectionStatus =
  | "idle"
  | "pairing"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface RemoteClientEvents {
  onStatus(status: ConnectionStatus): void;
  onState(state: StudioState): void;
  onError(message: string | null): void;
}

interface PairedSession {
  sessionId: string;
  studioName: string;
  topic: string;
  expiresAt: string;
}

interface RemoteCommandAck {
  id: string;
  ok: boolean;
  error?: string;
}

const SESSION_FUNCTION = "lumarig-remote-session";
const SAVED_SESSION_KEY = "lumarig.remote.session";

export class RemoteClient {
  private channel: RealtimeChannel | null = null;
  private latestRevision = -1;
  private closedByUser = false;
  private studioHandshakeTimer: number | null = null;
  private studioPresent = false;
  private pendingCommands = new Map<
    string,
    { timeout: number; reject: (message: string) => void }
  >();

  constructor(
    private readonly pairCode: string,
    private readonly events: RemoteClientEvents
  ) {}

  async connect() {
    this.closedByUser = false;
    this.latestRevision = -1;
    this.studioPresent = false;
    this.events.onError(null);

    try {
      const session = this.pairCode
        ? await this.pair(this.pairCode)
        : loadSavedSession();

      if (!session) {
        this.events.onStatus("idle");
        this.events.onError("Enter the pairing code shown in LumaRig Studio.");
        return;
      }

      await this.openChannel(session);
    } catch (cause) {
      this.events.onStatus("error");
      this.events.onError(messageOf(cause));
    }
  }

  async disconnect() {
    this.closedByUser = true;

    if (this.studioHandshakeTimer !== null) {
      window.clearTimeout(this.studioHandshakeTimer);
      this.studioHandshakeTimer = null;
    }

    for (const pending of this.pendingCommands.values()) {
      window.clearTimeout(pending.timeout);
    }
    this.pendingCommands.clear();
    this.latestRevision = -1;
    this.studioPresent = false;

    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.events.onStatus("disconnected");
  }

  command(command: RemoteCommand, payload?: Record<string, unknown>) {
    if (!this.channel || !this.studioPresent || this.latestRevision < 0) {
      this.events.onError("Studio is not ready for remote control.");
      return null;
    }
    if (this.pendingCommands.size >= 64) {
      this.events.onError("Too many remote commands are awaiting acknowledgement. Stop input and verify Studio.");
      return null;
    }

    const id = commandId();

    const timeout = window.setTimeout(() => {
      const pending = this.pendingCommands.get(id);
      if (!pending) return;
      this.pendingCommands.delete(id);
      pending.reject("Studio did not acknowledge the command.");
    }, 4000);

    this.pendingCommands.set(id, {
      timeout,
      reject: (message) => this.events.onError(message)
    });

    void this.channel
      .send({
        type: "broadcast",
        event: "remote_command",
        payload: {
          type: "command",
          id,
          command,
          payload
        }
      })
      .then((result) => {
        if (result === "ok") return;

        const pending = this.pendingCommands.get(id);
        if (!pending) return;

        window.clearTimeout(pending.timeout);
        this.pendingCommands.delete(id);
        pending.reject("Remote command could not be sent.");
      });

    return id;
  }

  private async pair(code: string): Promise<PairedSession> {
    this.events.onStatus("pairing");

    const normalized = code.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(normalized)) {
      throw new Error("Enter the 6-digit pairing code shown in LumaRig Studio.");
    }

    const { data, error } = await supabase.functions.invoke(SESSION_FUNCTION, {
      body: {
        action: "pair",
        code: normalized
      }
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));

    const session = data as PairedSession;
    saveSession(session);
    return session;
  }

  private async openChannel(session: PairedSession) {
    if (Date.parse(session.expiresAt) <= Date.now()) {
      clearSavedSession();
      throw new Error("The Studio remote session has expired. Generate a new pairing code.");
    }

    this.events.onStatus("connecting");

    const channel = supabase
      .channel(session.topic, {
        config: {
          broadcast: {
            self: false,
            ack: true
          },
          presence: {
            key: getRemoteInstanceId()
          }
        }
      })
      .on("broadcast", { event: "studio_state" }, ({ payload }) => {
        const state = payload as StudioState;
        if (!state || typeof state.revision !== "number") return;

        if (state.protocolVersion !== REMOTE_PROTOCOL_VERSION) {
          this.clearStudioHandshakeTimer();
          this.events.onStatus("error");
          this.events.onError(
            "This remote and LumaRig Studio use different control protocol versions. Update the older app before pairing."
          );
          return;
        }

        if (state.revision < this.latestRevision) return;

        this.latestRevision = state.revision;
        this.clearStudioHandshakeTimer();
        this.events.onStatus("connected");
        this.events.onState(state);
        this.events.onError(null);
      })
      .on("broadcast", { event: "command_ack" }, ({ payload }) => {
        const ack = payload as RemoteCommandAck;
        if (!ack || typeof ack.id !== "string") return;

        const pending = this.pendingCommands.get(ack.id);
        if (!pending) return;

        window.clearTimeout(pending.timeout);
        this.pendingCommands.delete(ack.id);

        if (!ack.ok) {
          pending.reject(ack.error ?? "Studio rejected the command.");
        }
      })
      .on("presence", { event: "sync" }, () => {
        const present = hasStudioPresence(channel.presenceState());

        if (present && !this.studioPresent) {
          this.studioPresent = true;
          this.events.onError(null);

          if (this.latestRevision >= 0) {
            this.events.onStatus("connected");
          } else {
            this.events.onStatus("connecting");
            this.requestStudioState(channel);
          }
          return;
        }

        if (!present && this.studioPresent) {
          this.studioPresent = false;
          this.events.onStatus("disconnected");
          this.events.onError("Studio left this remote session.");
        }
      });

    this.channel = channel;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          settled = true;
          this.events.onStatus("connecting");

          void channel.track({
            type: "remote",
            clientName: deviceName(),
            connectedAt: new Date().toISOString()
          });

          this.requestStudioState(channel);
          resolve();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          if (!this.closedByUser) {
            this.events.onStatus(
              settled ? "disconnected" : "error"
            );
          }

          if (!settled) {
            reject(error ?? new Error("Could not join the Studio remote session."));
          }
        }
      });
    });
  }

  private requestStudioState(channel: RealtimeChannel) {
    this.clearStudioHandshakeTimer();

    void channel.send({
      type: "broadcast",
      event: "remote_hello",
      payload: {
        clientName: deviceName(),
        clientVersion: "0.2.0"
      }
    });

    this.studioHandshakeTimer = window.setTimeout(() => {
      if (this.latestRevision >= 0) return;

      this.events.onStatus("error");
      this.events.onError(
        "Supabase is reachable, but LumaRig Studio did not answer this session. Generate a new pair code on the Mac."
      );
    }, 5000);
  }

  private clearStudioHandshakeTimer() {
    if (this.studioHandshakeTimer === null) return;
    window.clearTimeout(this.studioHandshakeTimer);
    this.studioHandshakeTimer = null;
  }
}

function saveSession(session: PairedSession) {
  localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(session));
}

export function loadSavedSession(): PairedSession | null {
  const raw = localStorage.getItem(SAVED_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as PairedSession;
    if (!session.topic || !session.expiresAt) {
      clearSavedSession();
      return null;
    }

    if (Date.parse(session.expiresAt) <= Date.now()) {
      clearSavedSession();
      return null;
    }

    return session;
  } catch {
    clearSavedSession();
    return null;
  }
}

export function clearSavedSession() {
  localStorage.removeItem(SAVED_SESSION_KEY);
}

function deviceName() {
  const ua = navigator.userAgent;
  if (
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "LumaRig Remote · iPad";
  }
  if (/iPhone/i.test(ua)) return "LumaRig Remote · iPhone";
  return "LumaRig Remote · Web";
}

function commandId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

function messageOf(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}


function getRemoteInstanceId() {
  const key = "lumarig.remote.instance-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : commandId();

  localStorage.setItem(key, "remote-" + id);
  return "remote-" + id;
}


export function hasStudioPresence(
  state: Record<string, Array<Record<string, unknown>>>
) {
  return Object.values(state).some((presences) =>
    presences.some((presence) => presence.type === "studio")
  );
}
