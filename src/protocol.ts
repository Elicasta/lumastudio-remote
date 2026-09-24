export const REMOTE_PROTOCOL_VERSION = 2 as const;

export const REMOTE_COMMANDS = [
  "transport.play",
  "transport.pause",
  "transport.stop",
  "transport.go",
  "transport.previous",
  "transport.next",
  "section.launch",
  "song.next",
  "song.previous",
  "song.select",
  "pad.trigger",
  "pad.release",
  "mixer.gain",
  "mixer.mute",
  "mixer.solo",
  "lighting.blackout",
  "lighting.scene",
  "lighting.xy"
] as const;

export type RemoteCommand = (typeof REMOTE_COMMANDS)[number];

export function isRemoteCommand(value: unknown): value is RemoteCommand {
  return REMOTE_COMMANDS.includes(value as RemoteCommand);
}

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
  ready: boolean;
  mode: "one-shot" | "loop" | "hold" | "latch";
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

export interface CountInSettings {
  mode: "none" | "beats" | "bars" | "adaptive";
  value?: number;
  minBeats?: number;
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
  countIn: CountInSettings;
  current: boolean;
}

export interface SetlistState {
  id: string;
  name: string;
  songs: SetlistSongState[];
}

export interface StudioState {
  protocolVersion: typeof REMOTE_PROTOCOL_VERSION;
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
    transitionActive: boolean;
    countInActive: boolean;
    countInBeat: number;
    countInTotal: number;
    countInBar: number;
    countInBars: number;
    queuedSectionId: string | null;
  };
  pads: PadState[];
  mixer: MixerChannelState[];
  lighting: {
    blackout: boolean;
    xySupported: boolean;
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
