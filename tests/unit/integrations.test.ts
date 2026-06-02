import { describe, expect, it } from "vitest";
import { evaluateAgentGateReadiness, summarizeForHandoffKit, type AuditRecord } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

describe("integrations", () => {
  it("reports AgentFit readiness from policy", () => {
    const readiness = evaluateAgentGateReadiness(balancedPolicy(), "agentgate.yml");

    expect(readiness.hasPolicy).toBe(true);
    expect(readiness.protectsSecrets).toBe(true);
    expect(readiness.protectsShell).toBe(true);
  });

  it("summarizes high-risk events for HandoffKit", () => {
    const records: AuditRecord[] = [
      {
        id: "evt",
        timestamp: "2026-06-02T12:00:00.000Z",
        event: {
          id: "evt",
          timestamp: "2026-06-02T12:00:00.000Z",
          kind: "fs.read",
          toolName: "fs.read",
          cwd: "/repo",
          path: ".ssh/id_rsa",
          metadata: {}
        },
        decision: {
          effect: "deny",
          risk: "critical",
          ruleId: "deny-private-key-reads",
          reason: "Private key reads are blocked",
          redactions: [],
          warnings: []
        },
        durationMs: 1,
        executed: false
      }
    ];

    const summary = summarizeForHandoffKit(".agentgate/audit.jsonl", records);
    expect(summary.totals.denied).toBe(1);
    expect(summary.highRiskEvents[0]?.reason).toBe("Private key reads are blocked");
  });
});
