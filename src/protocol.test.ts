import { describe, expect, it } from "vitest";
import { isServerMessage } from "./protocol";

describe("remote protocol", () => {
  it("accepts known server messages", () => {
    expect(isServerMessage({ type: "ack", id: "1" })).toBe(true);
    expect(isServerMessage({ type: "pong", at: 1 })).toBe(true);
  });

  it("rejects unknown messages", () => {
    expect(isServerMessage({ type: "explode" })).toBe(false);
    expect(isServerMessage(null)).toBe(false);
  });
});
