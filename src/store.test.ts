import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store";

describe("remote reducer", () => {
  it("moves GO to the next section", () => {
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "transport.go"
    });
    expect(next.studio.currentSectionIndex).toBe(
      initialState.studio.currentSectionIndex + 1
    );
  });

  it("launches a section by id", () => {
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "section.launch",
      payload: { id: "bridge" }
    });
    expect(next.studio.sections[next.studio.currentSectionIndex].id).toBe("bridge");
  });

  it("updates a mixer channel without touching another channel", () => {
    const originalSecond = initialState.studio.mixer[1].gainDb;
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "mixer.gain",
      payload: { id: "music", gainDb: -12 }
    });
    expect(next.studio.mixer[0].gainDb).toBe(-12);
    expect(next.studio.mixer[1].gainDb).toBe(originalSecond);
  });
});
