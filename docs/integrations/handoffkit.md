# HandoffKit Integration

HandoffKit should include AgentGate audit summaries when asked.

Proposed command:

```bash
handoffkit pack --goal "finish MCP proxy" --include-agentgate-log
```

Export shape:

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

Missing AgentGate logs should produce a warning, not fail a handoff packet.
