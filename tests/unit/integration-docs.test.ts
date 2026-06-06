import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("integration docs", () => {
  it("documents generic coding-agent shell and MCP setup", () => {
    const doc = fs.readFileSync(path.resolve("docs/integrations/coding-agents.md"), "utf8");

    expect(doc).toContain("node dist/cli/index.js check --strict");
    expect(doc).toContain("node dist/cli/index.js exec -- npm test");
    expect(doc).toContain("node dist/cli/index.js logs --review");
    expect(doc).toContain("agentgate mcp-proxy --config agentgate.yml --server filesystem");
    expect(doc).toContain("examples/policies/read-only-review.agentgate.yml");
    expect(doc).toContain("examples/policies/docs-maintainer.agentgate.yml");
    expect(doc).toContain("examples/policies/package-maintainer.agentgate.yml");
  });
});
