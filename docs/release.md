# Release

Run before publishing:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test tests/integration/mcp-proxy-e2e.test.ts
pnpm demo
pnpm smoke:package
pnpm smoke:install
npm publish --access public
```

The package must include:

- `dist`
- `README.md`
- `docs`
- `examples`

After publish:

```bash
npx @kingkyylian/agentgate@latest demo
```
