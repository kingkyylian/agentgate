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
agentgate mcp-proxy --config agentgate.yml --server filesystem
```

MCP `ask` decisions are non-interactive: AgentGate records the event, does not forward the tool call upstream, and returns a JSON-RPC error that includes `approval.reviewCommand: "agentgate logs --review"`.

## Audit Review

After a session, review only denied, asked, and redacted events:

```bash
node dist/cli/index.js logs --review
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
