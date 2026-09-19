import {
  isServerMessage,
  type ClientMessage,
  type RemoteCommand,
  type ServerMessage,
  type StudioState
} from "./protocol";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

interface RemoteClientEvents {
  onStatus(status: ConnectionStatus): void;
  onState(state: StudioState): void;
  onError(message: string): void;
}

export class RemoteClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempt = 0;
  private closedByUser = false;
  private latestRevision = -1;

  constructor(
    private readonly url: string,
    private readonly pin: string,
    private readonly events: RemoteClientEvents
  ) {}

  connect() {
    this.closedByUser = false;
    this.open("connecting");
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.socket?.close();
    this.socket = null;
    this.events.onStatus("disconnected");
  }

  command(command: RemoteCommand, payload?: Record<string, unknown>) {
    const id = commandId();
    this.send({ type: "command", id, command, payload });
    return id;
  }

  private open(status: ConnectionStatus) {
    this.events.onStatus(status);

    try {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      socket.addEventListener("open", () => {
        this.reconnectAttempt = 0;
        this.events.onStatus("connected");
        this.send({
          type: "hello",
          clientName: deviceName(),
          clientVersion: "0.1.0",
          pin: this.pin || undefined
        });

        this.heartbeatTimer = window.setInterval(() => {
          this.send({ type: "ping", at: Date.now() });
        }, 5000);
      });

      socket.addEventListener("message", (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as unknown;
          if (!isServerMessage(parsed)) return;
          this.handleMessage(parsed);
        } catch {
          this.events.onError("Studio sent an unreadable message.");
        }
      });

      socket.addEventListener("close", () => {
        if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
        this.socket = null;

        if (!this.closedByUser) this.scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        this.events.onStatus("error");
        this.events.onError("Could not reach LumaRig Studio.");
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "welcome":
        this.latestRevision = message.state.revision;
        this.events.onState(message.state);
        break;
      case "state":
        if (message.state.revision >= this.latestRevision) {
          this.latestRevision = message.state.revision;
          this.events.onState(message.state);
        }
        break;
      case "error":
        this.events.onError(message.message);
        break;
      case "ack":
      case "pong":
        break;
    }
  }

  private scheduleReconnect() {
    this.events.onStatus("reconnecting");
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 8000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => this.open("reconnecting"), delay);
  }

  private send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "LumaRig Remote · iPad";
  }
  if (/iPhone/i.test(ua)) return "LumaRig Remote · iPhone";
  return "LumaRig Remote · Web";
}

function commandId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
