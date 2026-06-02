import { describe, expect, it } from "vitest";
import { evaluateFilesystemEvent } from "../../src/guards/filesystem.js";
import { balancedPolicy } from "../../src/presets/balanced.js";
import type { ToolEvent } from "../../src/index.js";

const context = {
  workspaceRoot: "/repo",
  now: new Date("2026-06-02T12:00:00.000Z")
};

const event = (kind: "fs.read" | "fs.write", path: string): ToolEvent => ({
  id: "evt",
  timestamp: "2026-06-02T12:00:00.000Z",
  kind,
  toolName: kind,
  cwd: "/repo",
  path,
  metadata: {}
});

describe("evaluateFilesystemEvent", () => {
  it("allows writes inside configured writable paths", () => {
    const decision = evaluateFilesystemEvent(balancedPolicy(), event("fs.write", "src/index.ts"), context);
    expect(decision.effect).toBe("allow");
  });

  it("denies writes outside the workspace", () => {
    const decision = evaluateFilesystemEvent(balancedPolicy(), event("fs.write", "../outside.txt"), context);
    expect(decision.effect).toBe("deny");
    expect(decision.ruleId).toBe("fs-write-outside-workspace");
  });

  it("denies reads of env files", () => {
    const decision = evaluateFilesystemEvent(balancedPolicy(), event("fs.read", ".env"), context);
    expect(decision.effect).toBe("deny");
  });

  it("denies reads outside the workspace", () => {
    const decision = evaluateFilesystemEvent(balancedPolicy(), event("fs.read", "../outside.txt"), context);
    expect(decision.effect).toBe("deny");
    expect(decision.ruleId).toBe("fs-read-outside-workspace");
  });
});
