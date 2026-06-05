# Changelog

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
