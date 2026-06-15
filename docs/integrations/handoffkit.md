# HandoffKit Integration

HandoffKit should include AgentGate audit summaries when asked. HandoffKit packages handoff context, while AgentGate provides local evidence of what the agent was allowed, denied, asked to approve, or redacted.

## Fresh Checkout Example

```bash
pnpm install
pnpm build
node dist/cli/index.js logs --config agentgate.yml --format markdown
node dist/cli/index.js logs --config agentgate.yml --review
```

For a deterministic local example without running live tools, render the bundled redacted audit sample:

```bash
node --input-type=module -e 'import { readAuditRecords, renderAuditMarkdown } from "./dist/index.js"; const records = readAuditRecords("examples/reports/audit.jsonl", process.cwd()); console.log(renderAuditMarkdown(records));'
```

Expected output starts with:

```text
# AgentGate Audit Report

## Summary

- Total events: 4
- Denied: 1
- Asked: 1
- Redacted: 1
- Allowed: 1
- Redaction matches: 3
```

Use `agentgate logs --review` when the handoff only needs denied, asked, and redacted events without allowed-event noise.
Use `agentgate logs --review --effect deny,ask --limit 20` to keep large audit handoffs focused on recent blocked or approval-required events.
Use `agentgate logs --review --since <iso> --until <iso>` when a handoff should cover only one known session window.

If HandoffKit is installed, it can include this local summary:

```bash
handoffkit pack --goal "finish MCP proxy" --include-agentgate-log
```

Without HandoffKit installed, the same handoff payload can be inspected directly:

```bash
node --input-type=module -e 'import { readAuditRecords, summarizeForHandoffKit } from "./dist/index.js"; const auditPath = "examples/reports/audit.jsonl"; const records = readAuditRecords(auditPath, process.cwd()); console.log(JSON.stringify(summarizeForHandoffKit(auditPath, records), null, 2));'
```

Expected output shape:

```json
{
  "auditPath": "examples/reports/audit.jsonl",
  "totals": {
    "allowed": 1,
    "denied": 1,
    "asked": 1,
    "redacted": 1
  },
  "highRiskEvents": [
    {
      "timestamp": "2026-06-02T12:00:00.000Z",
      "toolName": "fs.read",
      "effect": "deny",
      "risk": "critical",
      "reason": "Credential reads are blocked"
    },
    {
      "timestamp": "2026-06-02T12:00:01.000Z",
      "toolName": "shell.exec",
      "effect": "ask",
      "risk": "high",
      "reason": "High-risk shell commands require approval"
    }
  ]
}
```

## Export Contract

```ts
export interface HandoffAgentGateSummary {
  auditPath: string;
  since?: string;
  totals: {
    allowed: number;
    denied: number;
    asked: number;
    redacted: number;
  };
  highRiskEvents: Array<{
    timestamp: string;
    toolName: string;
    effect: "deny" | "ask" | "redact";
    risk: "high" | "critical";
    reason: string;
  }>;
}
```

## Failure Modes

- Missing AgentGate logs should produce a warning in HandoffKit, not fail a handoff packet.
- In AgentGate alone, `readAuditRecords(".agentgate/missing.jsonl", process.cwd())` returns an empty list and `summarizeForHandoffKit(...)` returns zero totals.
- The bundled example report is redacted; it must not expose raw secret paths or tokens.
