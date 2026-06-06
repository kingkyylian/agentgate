# Roadmap

AgentGate v0.1 is the local-first CLI foundation: policy evaluation, guard modules, CLI enforcement, MCP stdio proxy MVP, audit logs, and release packaging.

## v0.2 Complete

- Tightened policy presets for common agent workflows.
- Improved MCP proxy ergonomics around server config, denied calls, and non-interactive ask decisions.
- Expanded audit summaries with clearer redaction and review sections.
- Added AgentFit and HandoffKit integration examples that can run from a fresh checkout.
- Added focused regression coverage for shell-risk parsing and MCP proxy failure modes.

## v0.3 Focus

- Make `agentgate check` more actionable for first-time setup, missing policy files, risky presets, audit readiness, and CI-friendly strict checks.
- Improve MCP proxy approval ergonomics while keeping non-interactive clients safe by default.
- Add clearer policy schema examples for common coding-agent setups.
- Add a lightweight audit-review workflow for recent denied, asked, and redacted events.
- Expand real-world integration examples beyond AgentFit and HandoffKit.

## Dependency Notes

- Commander 15 is ESM-only and requires Node `>=22.12.0`; AgentGate's package engine now matches that runtime floor.
- Review runtime dependency bumps separately from dev dependency bumps, even when CI is green.
