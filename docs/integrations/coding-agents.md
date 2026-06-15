# Coding Agent Integration

Use this flow for any coding agent that can run shell commands or connect to an MCP stdio server. AgentGate stays local: it evaluates tool calls, writes an audit log, and blocks or asks before risky actions run.

## Fresh Checkout Example

```bash
pnpm install
pnpm build
node dist/cli/index.js init --preset balanced --force
node dist/cli/index.js check --strict
```

Expected `check --strict` output includes:

```text
PASS policy: valid
PASS audit redaction: enabled
PASS credential read guard: configured
PASS private network guard: configured
PASS terminal approval: enabled
NEXT review audit events: agentgate logs --review
```

## Shell Gateway

When an agent can choose the command it runs, put `agentgate exec --` in front of the command:

```bash
node dist/cli/index.js exec -- npm test
node dist/cli/index.js exec -- pnpm check
```

High-risk shell commands ask before execution. Critical commands are denied.

## MCP Gateway

For MCP clients, configure an upstream server in `agentgate.yml`, then point the client at the AgentGate proxy:

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

Run the proxy:

```bash
agentgate mcp setup --server filesystem --launch global
agentgate mcp-proxy --config agentgate.yml --server filesystem
```

MCP `ask` decisions are non-interactive: AgentGate records the event, does not forward the tool call upstream, and returns a JSON-RPC error that includes `approval.reviewCommand: "agentgate logs --review"`.

### Global AgentGate CLI

Use this shape when `agentgate` is available on the MCP client's `PATH`:

```bash
agentgate mcp setup --server filesystem --launch global
```

```json
{
  "mcpServers": {
    "agentgate-filesystem": {
      "command": "agentgate",
      "args": ["mcp-proxy", "--config", "agentgate.yml", "--server", "filesystem"]
    }
  }
}
```

The packaged `examples/mcp/sample-client-config.json` uses this global CLI shape.

### Repo-local Node command

Use this shape from a fresh checkout after `pnpm build`, before the package is installed globally:

```bash
agentgate mcp setup --server filesystem --launch local
```

```json
{
  "mcpServers": {
    "agentgate-filesystem": {
      "command": "node",
      "args": ["dist/cli/index.js", "mcp-proxy", "--config", "agentgate.yml", "--server", "filesystem"]
    }
  }
}
```

### Registry-backed npx command

Use this shape when the MCP client can run package binaries but the project has not installed AgentGate locally:

```bash
agentgate mcp setup --server filesystem --launch npx
```

```json
{
  "mcpServers": {
    "agentgate-filesystem": {
      "command": "npx",
      "args": ["-y", "@kingkyylian/agentgate@latest", "mcp-proxy", "--config", "agentgate.yml", "--server", "filesystem"]
    }
  }
}
```

All three setup commands print JSON to stdout and read `agentgate.yml` from the MCP client's working directory unless `--config` points somewhere else. Audit records are written to the policy's `audit.path`; the default is `.agentgate/audit.jsonl`, resolved relative to the same working directory used by the client.

For non-interactive `ask` decisions, MCP clients should surface the JSON-RPC error instead of retrying automatically. The error data includes `approval.reviewCommand: "agentgate logs --review"` and `auditPath`, so clients can point the user at the relevant audit review command.

## Audit Review

After a session, review only denied, asked, and redacted events:

```bash
node dist/cli/index.js logs --review
```

Filter large audit files by decision effect and recent matching events:

```bash
node dist/cli/index.js logs --review --effect deny,ask --limit 20
node dist/cli/index.js logs --review --since 2026-06-02T12:00:00.000Z --until 2026-06-02T13:00:00.000Z
node dist/cli/index.js logs --review --format jsonl --effect redact --limit 10
```

Use the full report when you need allowed-event context too:

```bash
node dist/cli/index.js logs --format markdown
```

## Policy Starting Points

Copy one of these examples into `agentgate.yml` before starting an agent session:

- `examples/policies/read-only-review.agentgate.yml`: review, triage, and audit-only sessions.
- `examples/policies/docs-maintainer.agentgate.yml`: documentation and example updates.
- `examples/policies/package-maintainer.agentgate.yml`: package metadata, tests, docs, and release-prep work.

All three keep audit redaction enabled, block credential reads, and deny private, loopback, and link-local fetches.
