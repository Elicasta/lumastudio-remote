import type { RemoteCommand, SetlistSongState, StudioState } from "./protocol";
import { demoState, sectionsForSong } from "./mock";

export type View = "performance" | "pads" | "mixer" | "lighting" | "setlist";

export interface AppState {
  studio: StudioState;
  view: View;
  demo: boolean;
}

export type AppAction =
  | { type: "studio"; state: StudioState }
  | { type: "view"; view: View }
  | { type: "demoCommand"; command: RemoteCommand; payload?: Record<string, unknown> };

export const initialState: AppState = {
  studio: demoState,
  view: "performance",
  demo: false
};

export function reducer(state: AppState, action: AppAction): AppState {
  if (action.type === "studio") return { ...state, studio: action.state };
  if (action.type === "view") return { ...state, view: action.view };
  if (action.type !== "demoCommand") return state;

  const studio = structuredClone(state.studio);

  switch (action.command) {
    case "transport.play":
      studio.transport.playing = true;
      break;
    case "transport.pause":
    case "transport.stop":
      studio.transport.playing = false;
      if (action.command === "transport.stop") studio.transport.positionSeconds = 0;
      break;
    case "transport.next":
    case "transport.go":
      moveSection(studio, 1);
      break;
    case "transport.previous":
      moveSection(studio, -1);
      break;
    case "section.launch": {
      const id = String(action.payload?.id ?? "");
      const index = studio.sections.findIndex((section) => section.id === id);
      if (index >= 0) {
        studio.currentSectionIndex = index;
        studio.queuedSectionIndex =
          index < studio.sections.length - 1 ? index + 1 : null;
        studio.transport.bar = studio.sections[index].startBar;
        studio.transport.beat = 1;
      }
      break;
    }
    case "song.next":
      moveSong(studio, 1);
      break;
    case "song.previous":
      moveSong(studio, -1);
      break;
    case "song.select": {
      const id = String(action.payload?.id ?? "");
      const selected = studio.setlist.songs.find((song) => song.id === id);
      if (selected) loadSong(studio, selected);
      break;
    }
    case "pad.trigger": {
      const id = String(action.payload?.id ?? "");
      const pad = studio.pads.find((item) => item.id === id);
      if (pad) pad.active = true;
      break;
    }
    case "pad.release": {
      const id = String(action.payload?.id ?? "");
      const pad = studio.pads.find((item) => item.id === id);
      if (pad) pad.active = false;
      break;
    }
    case "mixer.gain": {
      const id = String(action.payload?.id ?? "");
      const channel = studio.mixer.find((item) => item.id === id);
      if (channel) channel.gainDb = Number(action.payload?.gainDb ?? channel.gainDb);
      break;
    }
    case "mixer.mute": {
      const id = String(action.payload?.id ?? "");
      const channel = studio.mixer.find((item) => item.id === id);
      if (channel) channel.muted = Boolean(action.payload?.muted);
      break;
    }
    case "mixer.solo": {
      const id = String(action.payload?.id ?? "");
      const channel = studio.mixer.find((item) => item.id === id);
      if (channel) channel.solo = Boolean(action.payload?.solo);
      break;
    }
    case "lighting.blackout":
      studio.lighting.blackout = Boolean(action.payload?.enabled);
      break;
    case "lighting.scene": {
      const id = String(action.payload?.id ?? "");
      studio.lighting.scenes.forEach((scene) => {
        scene.active = scene.id === id;
      });
      break;
    }
    case "lighting.xy":
      studio.lighting.x = Number(action.payload?.x ?? studio.lighting.x);
      studio.lighting.y = Number(action.payload?.y ?? studio.lighting.y);
      break;
  }

  studio.revision += 1;
  return { ...state, studio, demo: true };
}

function moveSection(studio: StudioState, delta: -1 | 1) {
  if (studio.sections.length === 0) return;

  const nextIndex = Math.max(
    0,
    Math.min(studio.sections.length - 1, studio.currentSectionIndex + delta)
  );

  studio.currentSectionIndex = nextIndex;
  studio.queuedSectionIndex =
    nextIndex < studio.sections.length - 1 ? nextIndex + 1 : null;
  studio.transport.bar = studio.sections[nextIndex].startBar;
  studio.transport.beat = 1;
}

function moveSong(studio: StudioState, delta: -1 | 1) {
  const songs = studio.setlist.songs;
  const currentIndex = songs.findIndex((song) => song.id === studio.song.id);
  if (currentIndex < 0) return;

  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= songs.length) return;

  loadSong(studio, songs[nextIndex]);
}

function loadSong(studio: StudioState, selected: SetlistSongState) {
  studio.setlist.songs.forEach((song) => {
    song.current = song.id === selected.id;
  });

  studio.song = {
    id: selected.id,
    title: selected.title,
    artist: selected.artist,
    bpm: selected.bpm,
    key: selected.key,
    meter: selected.meter
  };
  studio.sections = sectionsForSong(selected.id);
  studio.currentSectionIndex = 0;
  studio.queuedSectionIndex = studio.sections.length > 1 ? 1 : null;
  studio.transport.positionSeconds = 0;
  studio.transport.durationSeconds = selected.durationSeconds;
  studio.transport.bar = studio.sections[0]?.startBar ?? 1;
  studio.transport.beat = 1;
  studio.transport.playing = false;
}
