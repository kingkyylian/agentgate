# AgentFit Integration

AgentFit should treat AgentGate as local runtime-policy evidence. AgentFit answers "is this repo ready for an agent?", while AgentGate enforces the runtime boundary when tools run.

## Fresh Checkout Example

```bash
pnpm install
pnpm build
node dist/cli/index.js init --preset balanced --force
node dist/cli/index.js check --strict
```

Expected `check --strict` output:

```text
PASS policy: valid
PASS mode: enforce
PASS workspace: /path/to/repo
PASS audit: .agentgate/audit.jsonl
PASS audit redaction: enabled
PASS credential read guard: configured
PASS private network guard: configured
PASS terminal approval: enabled
PASS rules: 3
NEXT review audit events: agentgate logs --review
```

If AgentFit is installed, it can call AgentGate readiness from its own CLI:

```bash
agentfit eval --check-agentgate
```

Without AgentFit installed, the same local readiness shape can be inspected directly from AgentGate:

```bash
node --input-type=module -e 'import { loadPolicyFromPath, evaluateAgentGateReadiness } from "./dist/index.js"; const loaded = loadPolicyFromPath("agentgate.yml"); console.log(JSON.stringify(evaluateAgentGateReadiness(loaded.policy, loaded.path), null, 2));'
```

Expected output shape:

```json
{
  "hasPolicy": true,
  "policyPath": "agentgate.yml",
  "mode": "enforce",
  "protectsSecrets": true,
  "protectsShell": true,
  "protectsMcp": true,
  "warnings": []
}
```

## Readiness Contract

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

Suggested scoring:

- `+3` valid `agentgate.yml`.
- `+3` blocks secret file reads.
- `+2` shell command ask/deny policy.
- `+2` MCP policy or explicit non-use.
- `-5` monitor-only policy without explanation.

Use `agentgate check --strict` as a local gate when AgentFit should fail a repo readiness check on AgentGate warnings.

## Failure Modes

- If `agentfit` is not installed, use the `node --input-type=module` command above; no cloud service or telemetry is required.
- If `agentgate.yml` is missing, `evaluateAgentGateReadiness(null)` returns `hasPolicy: false` and a `No agentgate.yml policy found` warning.
- If the policy is `monitor`, AgentFit should warn that runtime blocking is disabled.
