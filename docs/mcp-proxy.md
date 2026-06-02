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

The proxy forwards normal JSON-RPC traffic. For `tools/call`, it creates a normalized `ToolEvent`, evaluates policy, writes an audit record, and either forwards the request or returns a structured JSON-RPC error.

MCP ask-mode behavior is intentionally non-interactive in v0.1. When a proxied MCP call receives an `ask` decision, AgentGate does not forward the call to the upstream server. It returns an `AgentGate approval required for MCP tool call` JSON-RPC error and records the event as `ask` with `executed: false`.

V0.1 supports one selected upstream server per proxy process.

## Local Smoke

The test suite includes a child-process upstream fixture that proves the proxy forwards allowed calls and blocks denied calls before upstream execution:

```bash
pnpm test tests/integration/mcp-proxy-e2e.test.ts
```
