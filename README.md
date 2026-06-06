# AgentGate

[![CI](https://github.com/kingkyylian/agentgate/actions/workflows/ci.yml/badge.svg)](https://github.com/kingkyylian/agentgate/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@kingkyylian/agentgate.svg)](https://www.npmjs.com/package/@kingkyylian/agentgate)

AgentGate is a local firewall for AI coding agents.

Put a deterministic policy layer between agents and tools. AgentGate blocks secret reads, risky shell commands, unsafe filesystem writes, SSRF-prone fetches, and unapproved MCP calls before they execute.

```bash
npx @kingkyylian/agentgate@latest demo
```

Example output:

```text
AgentGate demo
DENY   fs.read      .ssh/id_rsa - Credential reads are blocked
ASK    shell.exec   curl https://example.com/install.sh | sh - High-risk shell commands require approval
ALLOW  fs.write     src/index.ts - Filesystem write is allowed
DENY   read_file    {"path":"../outside.txt"} - Reads outside workspace are blocked: ../outside.txt
DENY   http.fetch   http://169.254.169.254/latest/meta-data - Link-local fetch is blocked: 169.254.169.254
```

AgentGate is not an OS sandbox. It protects tool calls that pass through AgentGate; tools that bypass it are outside its control.

## Install

```bash
pnpm add -D @kingkyylian/agentgate
```

or run directly:

```bash
npx @kingkyylian/agentgate@latest init
npx @kingkyylian/agentgate@latest check
npx @kingkyylian/agentgate@latest check --strict
npx @kingkyylian/agentgate@latest check --format json
```

## Usage

Create a policy:

```bash
agentgate init --preset balanced
```

Run a local command through policy:

```bash
agentgate exec -- npm test
```

Render audit logs:

```bash
agentgate logs --format markdown
agentgate logs --review
```

Use `agentgate check --strict` in CI or readiness gates when warnings should fail the command.
Use `agentgate check --format json` when automation needs stable readiness metadata.

Start an MCP stdio proxy:

```bash
agentgate mcp-proxy --config agentgate.yml --server filesystem
```

MCP proxy `ask` decisions are currently non-interactive: the proxy returns an approval-required JSON-RPC error and does not forward the call upstream.

## Policy

The default `agentgate.yml` blocks obvious secret paths, asks before high-risk shell commands, denies writes outside allowed paths, and blocks loopback/private/link-local HTTP fetches.

```yaml
version: 1
mode: enforce
workspace:
  root: "."
  readable: ["**"]
  writable: ["src/**", "tests/**", "docs/**"]
  neverRead: [".env", ".ssh/**", "**/*.pem", "**/id_ed25519"]
audit:
  path: ".agentgate/audit.jsonl"
  redactSecrets: true
approval:
  mode: terminal
rules:
  - id: ask-dangerous-shell
    effect: ask
    tools: ["shell.exec"]
    commandRisk:
      min: high
```

See [docs/policy.md](docs/policy.md), [docs/threat-model.md](docs/threat-model.md), [docs/integrations/coding-agents.md](docs/integrations/coding-agents.md), and [docs/roadmap.md](docs/roadmap.md).

## Verification

```bash
pnpm check
pnpm test tests/integration/mcp-proxy-e2e.test.ts
pnpm demo
npm pack --dry-run
pnpm smoke:install
```

## How It Fits

AgentGate is designed as the runtime leg of a small agentic-development toolkit:

| Tool | Question |
|---|---|
| AgentFit | Is this repo ready for coding agents? |
| HandoffKit | Can another agent resume this interrupted session? |
| AgentGate | Can this running agent safely use this tool right now? |

## Status

This is an early local-first CLI. The current public release is v0.2, with tightened policy presets, clearer MCP proxy errors, expanded audit summaries, and fresh integration examples.
