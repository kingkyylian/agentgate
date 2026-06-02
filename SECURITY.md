# Security

AgentGate blocks or audits tool calls that pass through its CLI or MCP proxy. It does not sandbox tools that bypass AgentGate.

## Reporting

Please report suspected vulnerabilities privately through GitHub security advisories when the repository is public. Include:

- AgentGate version or commit.
- Policy file used.
- Tool event or CLI command that bypassed policy.
- Expected decision and actual decision.

## Scope

In scope:

- Secret-path read bypasses through AgentGate.
- Unsafe write bypasses through AgentGate.
- MCP proxy allow/deny mistakes.
- Audit redaction leaks.

Out of scope:

- Direct shell access outside AgentGate.
- Local users modifying policy files.
- Missing OS/container isolation.
- Third-party MCP server vulnerabilities that do not pass through AgentGate.
