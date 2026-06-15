# Roadmap

AgentGate v0.1 is the local-first CLI foundation: policy evaluation, guard modules, CLI enforcement, MCP stdio proxy MVP, audit logs, and release packaging.

## v0.2 Complete

- Tightened policy presets for common agent workflows.
- Improved MCP proxy ergonomics around server config, denied calls, and non-interactive ask decisions.
- Expanded audit summaries with clearer redaction and review sections.
- Added AgentFit and HandoffKit integration examples that can run from a fresh checkout.
- Added focused regression coverage for shell-risk parsing and MCP proxy failure modes.

## v0.3 Complete

- Made `agentgate check` more actionable for first-time setup, missing policy files, risky presets, audit readiness, and CI-friendly strict checks.
- Added machine-readable `agentgate check --format json` output for automation.
- Improved MCP proxy approval diagnostics while keeping non-interactive clients safe by default.
- Added clearer policy schema examples for common coding-agent setups.
- Added a lightweight audit-review workflow for recent denied, asked, and redacted events.
- Added copy-ready MCP client setup recipes and validated packaged example policies in CI.

## v0.4 Focus

- Add an `agentgate mcp setup` workflow that prints or writes client-specific MCP config for common coding-agent clients.
- Add `agentgate policy test` so repos can keep policy fixture cases under version control and catch guard regressions before agent sessions.
- Add workspace readiness checks for MCP proxy wiring, audit review commands, ignored checkpoint files, and package-tarball hygiene.
- Add CI-friendly package-content smoke coverage that fails if local notes, tarballs, secrets, or build junk enter the npm package.
- Add a reusable GitHub Actions example for projects that want AgentGate as a release or agent-readiness gate.
- Keep core runtime local-only: no telemetry, no cloud dependency, and no claim that AgentGate is an OS sandbox.

## Dependency Notes

- Commander 15 is ESM-only and requires Node `>=22.12.0`; AgentGate's package engine now matches that runtime floor.
- Review runtime dependency bumps separately from dev dependency bumps, even when CI is green.
