import { describe, expect, it } from "vitest";
import { hasStudioPresence } from "./remoteClient";

describe("remote Studio presence", () => {
  it("detects the Studio separately from remote clients", () => {
    expect(
      hasStudioPresence({
        "remote-a": [{ type: "remote", clientName: "iPad" }],
        "studio-1": [{ type: "studio", connectedAt: "now" }]
      })
    ).toBe(true);
  });

  it("does not treat a Supabase channel subscription as a Studio connection", () => {
    expect(
      hasStudioPresence({
        "remote-a": [{ type: "remote", clientName: "iPhone" }]
      })
    ).toBe(false);
    expect(hasStudioPresence({})).toBe(false);
  });
});
