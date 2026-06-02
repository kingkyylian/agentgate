import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendAuditRecord, readAuditRecords, renderAuditMarkdown, type AuditRecord } from "../../src/index.js";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-audit-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const record = (cwd: string): AuditRecord => ({
  id: "evt",
  timestamp: "2026-06-02T12:00:00.000Z",
  event: {
    id: "evt",
    timestamp: "2026-06-02T12:00:00.000Z",
    kind: "fs.read",
    toolName: "fs.read",
    cwd,
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
});

describe("audit report", () => {
  it("writes JSONL and renders markdown", () => {
    const root = tempRoot();
    appendAuditRecord(".agentgate/audit.jsonl", record(root), true);
    const records = readAuditRecords(".agentgate/audit.jsonl", root);
    const markdown = renderAuditMarkdown(records);

    expect(records).toHaveLength(1);
    expect(markdown).toContain("# AgentGate Audit Report");
    expect(markdown).toContain("Private key reads are blocked");
  });
});
