import { describe, expect, it } from "vitest";
import { PolicyEngine, type AgentGatePolicy, type ToolEvent } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

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
});
