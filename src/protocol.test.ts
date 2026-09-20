import { describe, expect, it } from "vitest";
import { isRemoteCommand, REMOTE_COMMANDS } from "./protocol";

describe("remote protocol", () => {
  it("keeps the supported command contract explicit", () => {
    expect(REMOTE_COMMANDS).toContain("transport.go");
    expect(REMOTE_COMMANDS).toContain("song.next");
    expect(REMOTE_COMMANDS).toContain("lighting.blackout");
  });

  it("accepts only known remote commands", () => {
    expect(isRemoteCommand("transport.play")).toBe(true);
    expect(isRemoteCommand("song.next")).toBe(true);
    expect(isRemoteCommand("transport.explode")).toBe(false);
    expect(isRemoteCommand(null)).toBe(false);
  });
});
