# AgentGate Agent Instructions

## Project

AgentGate is a local-first TypeScript CLI that evaluates AI agent tool calls before execution. Keep changes focused on policy evaluation, guard behavior, CLI flows, MCP proxy handling, audit output, and documentation.

## Commands

- Install: `pnpm install`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`
- Full local gate: `pnpm check`
- Demo smoke: `node dist/cli/index.js demo`
- Package smoke: `npm pack --dry-run`

## Safety

- Do not weaken secret-path protections in `src/guards/filesystem.ts`.
- Do not remove the explicit threat-model language that AgentGate is not an OS sandbox.
- Do not add network calls, telemetry, or cloud dependencies to the core policy engine.
- Keep audit summaries redacted and avoid storing raw secret-bearing tool input in reports.
- Treat shell parsing as heuristic unless a real parser is added with tests.

## Verification

Run `pnpm check` after source changes. For CLI behavior changes, also run `node dist/cli/index.js demo` after build.
