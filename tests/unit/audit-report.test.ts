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

  it("redacts secret paths and token-bearing input before writing JSONL", () => {
    const root = tempRoot();
    appendAuditRecord(".agentgate/audit.jsonl", {
      ...record(root),
      event: {
        ...record(root).event,
        path: ".aws/credentials",
        input: {
          env: "token=ghp_123456789012345678901234"
        }
      }
    }, true);

    const raw = fs.readFileSync(path.join(root, ".agentgate/audit.jsonl"), "utf8");
    expect(raw).toContain("[REDACTED]");
    expect(raw).not.toContain(".aws/credentials");
    expect(raw).not.toContain("ghp_123456789012345678901234");
  });

  it("groups redacted decisions and avoids raw secret-bearing display values", () => {
    const markdown = renderAuditMarkdown([
      record("/repo"),
      {
        ...record("/repo"),
        id: "evt_redact",
        timestamp: "2026-06-02T12:00:01.000Z",
        event: {
          ...record("/repo").event,
          id: "evt_redact",
          path: ".env.local",
          input: {
            token: "ghp_123456789012345678901234"
          }
        },
        decision: {
          effect: "redact",
          risk: "medium",
          ruleId: "redact-secrets",
          reason: "Secret-bearing input was redacted",
          redactions: [
            { field: "event.input", pattern: "github-token" }
          ],
          warnings: []
        },
        executed: true
      },
      {
        ...record("/repo"),
        id: "evt_allow",
        timestamp: "2026-06-02T12:00:02.000Z",
        event: {
          ...record("/repo").event,
          id: "evt_allow",
          kind: "fs.write",
          toolName: "fs.write",
          path: "docs/guide.md"
        },
        decision: {
          effect: "allow",
          risk: "low",
          ruleId: "allow",
          reason: "Filesystem write is allowed",
          redactions: [],
          warnings: []
        },
        executed: true
      }
    ]);

    expect(markdown).toContain("- Redacted: 1");
    expect(markdown).toContain("## Redacted");
    expect(markdown).toContain("Secret-bearing input was redacted");
    expect(markdown).toContain("## Redaction Matches");
    expect(markdown).toContain("event.input: github-token");
    expect(markdown).toContain("[REDACTED]");
    expect(markdown).not.toContain(".env.local");
    expect(markdown).not.toContain("ghp_123456789012345678901234");
  });

  it("keeps the example markdown report aligned with the example JSONL records", () => {
    const jsonl = fs.readFileSync(path.resolve("examples/reports/audit.jsonl"), "utf8");
    const records = jsonl.split("\n").filter(Boolean).map((line) => JSON.parse(line) as AuditRecord);
    const expected = fs.readFileSync(path.resolve("examples/reports/audit.md"), "utf8").trim();

    expect(renderAuditMarkdown(records).trim()).toBe(expected);
  });
});
