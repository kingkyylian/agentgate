# MCP Proxy

AgentGate can run as a stdio MCP proxy between an MCP client and one upstream MCP server.

```yaml
mcp:
  upstreams:
    filesystem:
      command: "npx"
      args:
        - "-y"
        - "@modelcontextprotocol/server-filesystem"
        - "."
```

Run:

```bash
agentgate mcp-proxy --server filesystem
```

If `--server` is omitted, AgentGate uses the first configured upstream. If a name is provided and it is not configured, the CLI exits with a `FAIL mcp-proxy` message that includes the available upstream names.

The proxy forwards normal JSON-RPC traffic. For `tools/call`, it creates a normalized `ToolEvent`, evaluates policy, writes an audit record, and either forwards the request or returns a structured JSON-RPC error.

MCP ask-mode behavior is intentionally non-interactive in v0.1. When a proxied MCP call receives an `ask` decision, AgentGate does not forward the call to the upstream server. It returns an `AgentGate approval required for MCP tool call` JSON-RPC error and records the event as `ask` with `executed: false`.

Denied and approval-required responses use JSON-RPC error code `-32000`. The `error.data` object includes:

- `ruleId`, `reason`, and `risk`
- `effect`, such as `deny` or `ask`
- `executed: false`
- `serverName` and `toolName`
- `nonInteractive: true` for MCP ask decisions

Startup and config failures are reported to stderr as actionable CLI errors:

- Missing policy: `FAIL mcp-proxy: No agentgate.yml found. Run agentgate init first.`
- Invalid policy schema: `FAIL mcp-proxy: Invalid AgentGate policy ...`
- Unknown upstream: `FAIL mcp-proxy: No MCP upstream named "shell" configured in agentgate.yml. Available upstreams: filesystem`
- Child process spawn failure: `AgentGate MCP upstream "filesystem" failed to start: ...`

V0.1 supports one selected upstream server per proxy process.

## Local Smoke

The test suite includes a child-process upstream fixture that proves the proxy forwards allowed calls, blocks denied calls before upstream execution, reports non-interactive ask decisions, and handles common startup failures:

```bash
pnpm test tests/integration/mcp-proxy-e2e.test.ts
```
