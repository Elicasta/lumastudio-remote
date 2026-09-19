import type { RemoteCommand, StudioState } from "./protocol";
import { demoState } from "./mock";

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
      studio.currentSectionIndex = Math.min(
        studio.sections.length - 1,
        studio.currentSectionIndex + 1
      );
      studio.queuedSectionIndex = Math.min(
        studio.sections.length - 1,
        studio.currentSectionIndex + 1
      );
      break;
    case "transport.previous":
      studio.currentSectionIndex = Math.max(0, studio.currentSectionIndex - 1);
      studio.queuedSectionIndex = Math.min(
        studio.sections.length - 1,
        studio.currentSectionIndex + 1
      );
      break;
    case "section.launch": {
      const id = String(action.payload?.id ?? "");
      const index = studio.sections.findIndex((section) => section.id === id);
      if (index >= 0) studio.currentSectionIndex = index;
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
