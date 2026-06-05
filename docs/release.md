# Release

## Manual Publish

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

If npm requires browser-based OTP, run `npm publish --access public` from an interactive terminal so npm can open the real auth URL.

The package must include:

- `dist`
- `README.md`
- `docs`
- `examples`

After publish:

```bash
npx @kingkyylian/agentgate@latest demo
```

## GitHub Release

Create the release tag on the exact commit that matches the published package version:

```bash
git tag -a vX.Y.Z -m "AgentGate vX.Y.Z"
git push origin vX.Y.Z
gh release create vX.Y.Z --title "AgentGate vX.Y.Z" --notes "Release notes"
```

## Trusted Publishing

Future releases should publish through `.github/workflows/publish.yml` instead of a local npm token.

Configure the npm package trusted publisher before relying on the workflow:

- Provider: GitHub Actions
- Organization or user: `kingkyylian`
- Repository: `agentgate`
- Workflow filename: `publish.yml`

The workflow runs only when a non-prerelease GitHub Release is published from a `v*` tag. It verifies that the tag version matches `package.json`, checks that the npm version does not already exist, runs the release gates, and publishes with provenance.
