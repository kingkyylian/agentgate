# Changelog

## Unreleased

- Made `agentgate check` more actionable with first-run guidance, readiness warnings, next-step hints, and `--strict` failure behavior for CI gates.
- Added `agentgate logs --review` for denied, asked, and redacted audit events without allowed-event noise.
- Added actionable non-interactive MCP approval metadata with audit review guidance.
- Added common setup policies for read-only review, docs maintenance, and package maintenance agent sessions.
- Added a generic coding-agent integration guide covering shell gateway, MCP proxy, audit review, and policy starting points.

## 0.2.0

- Raised the runtime floor to Node `>=22.12.0` and upgraded Commander to 15.
- Tightened built-in policy presets and example policies around credential reads, common coding-agent flows, and private-network fetch protections.
- Improved MCP proxy diagnostics for missing config, invalid policy schema, unknown upstream names, denied calls, non-interactive ask decisions, and child process startup failures.
- Expanded shell-risk and MCP failure regression coverage for install pipes, destructive filesystem commands, token exposure, low-risk developer commands, denied MCP calls, approval-required MCP calls, invalid server config, and child process errors.
- Expanded audit Markdown summaries with denied, asked, redacted, allowed, and redaction-match sections, plus stronger redaction for secret paths and token-bearing input.
- Added copy-pastable AgentFit and HandoffKit integration examples with local fallback commands and expected outputs.

## 0.1.2

- Added GitHub Actions trusted publishing with npm provenance for future releases.
- Added release documentation for the npm trusted publisher `publish.yaml` workflow and required publish permission.
- Added README badges, release notes, and v0.2 roadmap tracking.

## 0.1.1

- Published the initial public npm release after the 0.1.0 version was reserved during publish verification.

## 0.1.0

- Added local policy engine with allow, deny, ask, and redact decisions.
- Added filesystem, shell, HTTP, secret, and MCP guard modules.
- Added CLI commands for init, check, demo, exec, logs, MCP proxy, and policy explain.
- Added JSONL audit logs and Markdown audit reports.
- Added AgentFit readiness and HandoffKit audit summary integration contracts.
- Added threat model, policy docs, MCP proxy docs, and example policies.
- Added MCP proxy child-process smoke coverage for allowed and denied tool calls.
- Documented non-interactive MCP ask-mode behavior.
- Added install smoke coverage for the packed npm tarball.
