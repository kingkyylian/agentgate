import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("agentgate demo", () => {
  it("prints deny, ask, and allow decisions", async () => {
    const result = await execa("node", ["dist/cli/index.js", "demo"], {
      cwd: process.cwd()
    });

    expect(result.stdout).toContain("AgentGate demo");
    expect(result.stdout).toContain("DENY");
    expect(result.stdout).toContain("ASK");
    expect(result.stdout).toContain("ALLOW");
  });
});
