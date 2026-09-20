import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store";

describe("remote reducer", () => {
  it("moves GO to the next section without changing songs", () => {
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "transport.go"
    });

    expect(next.studio.currentSectionIndex).toBe(
      initialState.studio.currentSectionIndex + 1
    );
    expect(next.studio.song.id).toBe(initialState.studio.song.id);
  });

  it("launches a section by id", () => {
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "section.launch",
      payload: { id: "bridge" }
    });

    expect(next.studio.sections[next.studio.currentSectionIndex].id).toBe("bridge");
  });

  it("moves to the next song and resets the section safely", () => {
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "song.next"
    });

    expect(next.studio.song.id).toBe("graves");
    expect(next.studio.currentSectionIndex).toBe(0);
    expect(next.studio.transport.playing).toBe(false);
    expect(next.studio.transport.positionSeconds).toBe(0);
    expect(
      next.studio.setlist.songs.find((song) => song.id === "graves")?.current
    ).toBe(true);
  });

  it("selects a setlist song directly", () => {
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "song.select",
      payload: { id: "holy" }
    });

    expect(next.studio.song.id).toBe("holy");
    expect(next.studio.currentSectionIndex).toBe(0);
  });

  it("does not wrap next song at the end of the set", () => {
    const living = reducer(initialState, {
      type: "demoCommand",
      command: "song.select",
      payload: { id: "living" }
    });
    const next = reducer(living, {
      type: "demoCommand",
      command: "song.next"
    });

    expect(next.studio.song.id).toBe("living");
  });

  it("updates a mixer channel without touching another channel", () => {
    const originalSecond = initialState.studio.mixer[1].gainDb;
    const next = reducer(initialState, {
      type: "demoCommand",
      command: "mixer.gain",
      payload: { id: "click", gainDb: -12 }
    });

    expect(next.studio.mixer[0].gainDb).toBe(-12);
    expect(next.studio.mixer[1].gainDb).toBe(originalSecond);
  });
});
