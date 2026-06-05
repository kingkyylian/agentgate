import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { PolicyEngine, policyForPreset, type AgentGatePolicy, type PresetName, type ToolEvent } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";
import { strictPolicy } from "../../src/presets/strict.js";

const context = {
  workspaceRoot: "/repo",
  now: new Date("2026-06-02T12:00:00.000Z")
};

const baseEvent = (partial: Partial<ToolEvent>): ToolEvent => ({
  id: "evt_1",
  timestamp: "2026-06-02T12:00:00.000Z",
  kind: "fs.read",
  toolName: "fs.read",
  cwd: "/repo",
  metadata: {},
  ...partial
});

describe("PolicyEngine", () => {
  it("denies a matching private key read", () => {
    const engine = new PolicyEngine(balancedPolicy());
    const decision = engine.evaluate(baseEvent({ path: ".ssh/id_rsa" }), context);

    expect(decision.effect).toBe("deny");
    expect(decision.ruleId).toBe("deny-private-key-reads");
  });

  it("allows when no rule or built-in guard blocks", () => {
    const engine = new PolicyEngine(balancedPolicy());
    const decision = engine.evaluate(baseEvent({ path: "src/index.ts" }), context);

    expect(decision.effect).toBe("allow");
  });

  it("allows public HTTP fetches under the balanced policy", () => {
    const engine = new PolicyEngine(balancedPolicy());
    const decision = engine.evaluate(baseEvent({
      kind: "http.fetch",
      toolName: "http.fetch",
      url: "https://example.com"
    }), context);

    expect(decision.effect).toBe("allow");
  });

  it("keeps common coding-agent flows usable across balanced and strict presets", () => {
    const balanced = new PolicyEngine(balancedPolicy());
    const strict = new PolicyEngine(strictPolicy());

    expect(balanced.evaluate(baseEvent({
      kind: "shell.exec",
      toolName: "shell.exec",
      command: ["pnpm", "test"]
    }), context).effect).toBe("allow");
    expect(strict.evaluate(baseEvent({
      kind: "shell.exec",
      toolName: "shell.exec",
      command: ["pnpm", "test"]
    }), context).effect).toBe("allow");
    expect(balanced.evaluate(baseEvent({
      kind: "shell.exec",
      toolName: "shell.exec",
      command: ["pnpm", "install"]
    }), context).effect).toBe("allow");
    expect(strict.evaluate(baseEvent({
      kind: "shell.exec",
      toolName: "shell.exec",
      command: ["pnpm", "install"]
    }), context).effect).toBe("ask");
  });

  it("allows docs edits but denies writes outside the configured workspace", () => {
    const engine = new PolicyEngine(balancedPolicy());

    expect(engine.evaluate(baseEvent({
      kind: "fs.write",
      toolName: "fs.write",
      path: "docs/guide.md"
    }), context).effect).toBe("allow");
    expect(engine.evaluate(baseEvent({
      kind: "fs.write",
      toolName: "fs.write",
      path: "../outside.txt"
    }), context).effect).toBe("deny");
  });

  it("denies credential material reads through filesystem and MCP tools", () => {
    const engine = new PolicyEngine(balancedPolicy());

    expect(engine.evaluate(baseEvent({ path: ".aws/credentials" }), context).effect).toBe("deny");
    expect(engine.evaluate(baseEvent({
      kind: "mcp.tool",
      toolName: "read_file",
      input: {
        path: ".env.local"
      }
    }), context).effect).toBe("deny");
  });

  it("turns deny into allow with warning in monitor mode", () => {
    const policy: AgentGatePolicy = {
      ...balancedPolicy(),
      mode: "monitor"
    };
    const engine = new PolicyEngine(policy);
    const decision = engine.evaluate(baseEvent({ path: ".ssh/id_rsa" }), context);

    expect(decision.effect).toBe("allow");
    expect(decision.warnings[0]).toContain("Monitor mode");
  });

  it.each(["balanced", "strict", "monitor"] as PresetName[])("keeps the %s example policy aligned with the built-in preset", (preset) => {
    const examplePath = path.resolve(`examples/policies/${preset}.agentgate.yml`);
    const examplePolicy = parse(fs.readFileSync(examplePath, "utf8"));

    expect(examplePolicy).toEqual(policyForPreset(preset));
  });
});
