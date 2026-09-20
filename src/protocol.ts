export type RemoteCommand =
  | "transport.play"
  | "transport.pause"
  | "transport.stop"
  | "transport.go"
  | "transport.previous"
  | "transport.next"
  | "section.launch"
  | "song.next"
  | "song.previous"
  | "song.select"
  | "pad.trigger"
  | "pad.release"
  | "mixer.gain"
  | "mixer.mute"
  | "mixer.solo"
  | "lighting.blackout"
  | "lighting.scene"
  | "lighting.xy";

export interface SectionState {
  id: string;
  name: string;
  startBar: number;
  lengthBars: number;
}

export interface PadState {
  id: string;
  name: string;
  active: boolean;
  color: string;
}

export interface MixerChannelState {
  id: string;
  name: string;
  gainDb: number;
  muted: boolean;
  solo: boolean;
  meter: number;
  color: string;
}

export interface LightingSceneState {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface SetlistSongState {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  meter: [number, number];
  durationSeconds: number;
  status: "ready" | "needs-review" | "processing";
  current: boolean;
}

export interface SetlistState {
  id: string;
  name: string;
  songs: SetlistSongState[];
}

export interface StudioState {
  revision: number;
  setlist: SetlistState;
  song: {
    id: string;
    title: string;
    artist: string;
    bpm: number;
    key: string;
    meter: [number, number];
  };
  sections: SectionState[];
  currentSectionIndex: number;
  queuedSectionIndex: number | null;
  transport: {
    playing: boolean;
    positionSeconds: number;
    durationSeconds: number;
    bar: number;
    beat: number;
  };
  pads: PadState[];
  mixer: MixerChannelState[];
  lighting: {
    blackout: boolean;
    scenes: LightingSceneState[];
    x: number;
    y: number;
  };
  health: {
    audio: boolean;
    midi: boolean;
    lighting: boolean;
    remote: boolean;
  };
}

export type ClientMessage =
  | {
      type: "hello";
      clientName: string;
      clientVersion: string;
      pin?: string;
    }
  | {
      type: "command";
      id: string;
      command: RemoteCommand;
      payload?: Record<string, unknown>;
    }
  | {
      type: "ping";
      at: number;
    };

export type ServerMessage =
  | { type: "welcome"; sessionId: string; state: StudioState }
  | { type: "state"; state: StudioState }
  | { type: "ack"; id: string }
  | { type: "error"; id?: string; message: string }
  | { type: "pong"; at: number };

export function isServerMessage(value: unknown): value is ServerMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return ["welcome", "state", "ack", "error", "pong"].includes(String(type));
}
