import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import { renderPolicyYaml, type AuditRecord, type ToolEvent } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-cli-policy-logs-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("agentgate policy/logs", () => {
  it("explains a denied event from a ToolEvent JSON file", async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(balancedPolicy()), "utf8");
    const event: ToolEvent = {
      id: "evt",
      timestamp: "2026-06-02T12:00:00.000Z",
      kind: "fs.read",
      toolName: "fs.read",
      cwd: root,
      path: ".ssh/id_rsa",
      metadata: {}
    };
    fs.writeFileSync(path.join(root, "event.json"), JSON.stringify(event), "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "policy", "explain", "--event", "event.json"], {
      cwd: root
    });

    const decision = JSON.parse(result.stdout) as { effect: string; ruleId: string };
    expect(decision.effect).toBe("deny");
    expect(decision.ruleId).toBe("deny-private-key-reads");
  });

  it("renders markdown audit logs", async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(balancedPolicy()), "utf8");
    fs.mkdirSync(path.join(root, ".agentgate"), { recursive: true });
    const record: AuditRecord = {
      id: "evt",
      timestamp: "2026-06-02T12:00:00.000Z",
      event: {
        id: "evt",
        timestamp: "2026-06-02T12:00:00.000Z",
        kind: "fs.read",
        toolName: "fs.read",
        cwd: root,
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
    };
    fs.writeFileSync(path.join(root, ".agentgate/audit.jsonl"), `${JSON.stringify(record)}\n`, "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "logs", "--format", "markdown"], {
      cwd: root
    });

    expect(result.stdout).toContain("# AgentGate Audit Report");
    expect(result.stdout).toContain("Private key reads are blocked");
  });
});
