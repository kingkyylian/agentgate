# Roadmap

AgentGate v0.1 is the local-first CLI foundation: policy evaluation, guard modules, CLI enforcement, MCP stdio proxy MVP, audit logs, and release packaging.

## v0.2 Focus

- Tighten policy presets for common agent workflows.
- Improve MCP proxy ergonomics around server config, denied calls, and non-interactive ask decisions.
- Expand audit summaries with clearer redaction and review sections.
- Add AgentFit and HandoffKit integration examples that can run from a fresh checkout.
- Add focused regression coverage for shell-risk parsing and MCP proxy failure modes.

## Dependency Notes

- Keep `commander` on the current runtime-major until Commander 15 is verified against AgentGate's Node engine and CLI packaging assumptions.
- Review runtime dependency bumps separately from dev dependency bumps, even when CI is green.
