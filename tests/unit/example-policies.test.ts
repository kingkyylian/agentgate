import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPolicyFromPath } from "../../src/index.js";

const examplesDir = path.resolve("examples/policies");

const examplePolicyPaths = (): string[] =>
  fs.readdirSync(examplesDir)
    .filter((entry) => entry.endsWith(".agentgate.yml"))
    .sort()
    .map((entry) => path.join(examplesDir, entry));

describe("example policies", () => {
  it("parses every packaged example policy and keeps the expected guard shape", () => {
    const policyPaths = examplePolicyPaths();

    expect(policyPaths.length).toBeGreaterThan(0);

    for (const policyPath of policyPaths) {
      const { policy } = loadPolicyFromPath(policyPath);

      expect(policy.version).toBe(1);
      expect(policy.workspace.root).toBe(".");
      expect(policy.workspace.readable).toContain("**");
      expect(policy.workspace.neverRead).toEqual(expect.arrayContaining([
        ".env",
        ".env.*",
        ".ssh/**",
        "**/*.pem",
        "**/.npmrc"
      ]));
      expect(policy.audit).toEqual({
        path: ".agentgate/audit.jsonl",
        redactSecrets: true
      });
      expect(policy.rules).toEqual(expect.arrayContaining([
        expect.objectContaining({
          effect: "deny",
          tools: expect.arrayContaining(["fs.read", "mcp.tool", "read_file"]),
          paths: expect.arrayContaining([".env", ".ssh/**", "**/.npmrc"])
        }),
        expect.objectContaining({
          effect: "ask",
          tools: expect.arrayContaining(["shell.exec"]),
          commandRisk: expect.objectContaining({
            min: expect.stringMatching(/^(medium|high)$/)
          })
        }),
        expect.objectContaining({
          effect: "deny",
          tools: expect.arrayContaining(["http.fetch", "mcp.tool", "fetch"]),
          urls: expect.objectContaining({
            denyPrivateNetworks: true,
            denyLinkLocal: true,
            denyLoopback: true
          })
        })
      ]));
    }
  });

  it("keeps documentation references aligned with packaged example policies", () => {
    const docsText = [
      "README.md",
      "docs/policy.md",
      "docs/integrations/coding-agents.md"
    ].map((docPath) => fs.readFileSync(path.resolve(docPath), "utf8")).join("\n");

    const referencedPolicyFiles = new Set(
      [...docsText.matchAll(/examples\/policies\/([a-z0-9-]+\.agentgate\.yml)/g)]
        .map((match) => match[1])
    );
    const packagedPolicyFiles = new Set(
      examplePolicyPaths().map((policyPath) => path.basename(policyPath))
    );

    expect([...referencedPolicyFiles].sort()).toEqual([...packagedPolicyFiles].sort());
  });
});
