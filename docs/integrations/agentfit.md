# AgentFit Integration

AgentFit should treat AgentGate as runtime policy evidence.

Proposed command:

```bash
agentfit eval --check-agentgate
```

Readiness shape:

```ts
export interface AgentGateReadiness {
  hasPolicy: boolean;
  policyPath?: string;
  mode?: "monitor" | "enforce" | "ask";
  protectsSecrets: boolean;
  protectsShell: boolean;
  protectsMcp: boolean;
  warnings: string[];
}
```

Scoring:

- `+3` valid `agentgate.yml`.
- `+3` blocks secret file reads.
- `+2` shell command ask/deny policy.
- `+2` MCP policy or explicit non-use.
- `-5` monitor-only policy without explanation.
