import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("integration docs", () => {
  it("documents generic coding-agent shell and MCP setup", () => {
    const doc = fs.readFileSync(path.resolve("docs/integrations/coding-agents.md"), "utf8");

    expect(doc).toContain("node dist/cli/index.js check --strict");
    expect(doc).toContain("node dist/cli/index.js exec -- npm test");
    expect(doc).toContain("node dist/cli/index.js logs --review");
    expect(doc).toContain("agentgate mcp setup --server filesystem --launch global");
    expect(doc).toContain("agentgate mcp-proxy --config agentgate.yml --server filesystem");
    expect(doc).toContain("examples/policies/read-only-review.agentgate.yml");
    expect(doc).toContain("examples/policies/docs-maintainer.agentgate.yml");
    expect(doc).toContain("examples/policies/package-maintainer.agentgate.yml");
  });

  it("documents copy-ready MCP client recipes and keeps referenced paths valid", () => {
    const doc = fs.readFileSync(path.resolve("docs/integrations/coding-agents.md"), "utf8");

    expect(doc).toContain("### Global AgentGate CLI");
    expect(doc).toContain("agentgate mcp setup --server filesystem --launch global");
    expect(doc).toContain('"command": "agentgate"');
    expect(doc).toContain("### Repo-local Node command");
    expect(doc).toContain("agentgate mcp setup --server filesystem --launch local");
    expect(doc).toContain('"command": "node"');
    expect(doc).toContain("### Registry-backed npx command");
    expect(doc).toContain("agentgate mcp setup --server filesystem --launch npx");
    expect(doc).toContain('"command": "npx"');
    expect(doc).toContain("audit.path");
    expect(doc).toContain('approval.reviewCommand: "agentgate logs --review"');

    const referencedPaths = [...doc.matchAll(/`((?:docs|examples)\/[^`]+)`/g)]
      .map((match) => match[1])
      .filter((referencedPath): referencedPath is string => referencedPath !== undefined);

    expect(referencedPaths).toContain("examples/mcp/sample-client-config.json");
    for (const referencedPath of referencedPaths) {
      expect(fs.existsSync(path.resolve(referencedPath))).toBe(true);
    }
  });
});
