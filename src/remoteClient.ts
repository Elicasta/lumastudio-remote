import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RemoteCommand, StudioState } from "./protocol";
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

    for (const pending of this.pendingCommands.values()) {
      window.clearTimeout(pending.timeout);
    }
    this.pendingCommands.clear();

    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.events.onStatus("disconnected");
  }

  command(command: RemoteCommand, payload?: Record<string, unknown>) {
    if (!this.channel) {
      this.events.onError("Remote is not connected to Studio.");
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
        if (state.revision < this.latestRevision) return;

        this.latestRevision = state.revision;
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
      });

    this.channel = channel;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          settled = true;
          this.events.onStatus("connected");

          void channel.track({
            type: "remote",
            clientName: deviceName(),
            connectedAt: new Date().toISOString()
          });

          void channel.send({
            type: "broadcast",
            event: "remote_hello",
            payload: {
              clientName: deviceName(),
              clientVersion: "0.2.0"
            }
          });

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
