# Contributing

AgentGate is a local-first runtime policy gateway for AI coding-agent tool calls.

## Development

```bash
pnpm install
pnpm check
node dist/cli/index.js demo
npm pack --dry-run
```

## Pull Requests

- Keep policy-engine changes covered by unit tests.
- Add CLI integration tests for new user-facing commands or flags.
- Keep `docs/threat-model.md` honest when security boundaries change.
- Do not add telemetry, cloud dependencies, or remote policy sync to the core package.
- Do not weaken default secret path protections without a replacement guard and regression test.

## Security Changes

AgentGate is a gateway, not an OS sandbox. Security-related PRs should describe what is protected, what remains out of scope, and which verification command proves the behavior.
