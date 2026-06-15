import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

describe("GitHub Actions examples", () => {
  it("ships a copy-ready AgentGate gate workflow with strict and smoke checks", () => {
    const workflowPath = path.resolve("examples/github-actions/agentgate-gate.yml");
    const workflowText = fs.readFileSync(workflowPath, "utf8");
    const workflow = parse(workflowText) as {
      jobs?: Record<string, { steps?: Array<{ uses?: string; run?: string; with?: Record<string, unknown> }> }>;
    };
    const steps = workflow.jobs?.["agentgate"]?.steps ?? [];
    const runCommands = steps.map((step) => step.run).filter((run): run is string => typeof run === "string");

    expect(steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ uses: "actions/checkout@v6" }),
      expect.objectContaining({ uses: "actions/setup-node@v6" })
    ]));
    expect(runCommands).toEqual(expect.arrayContaining([
      "corepack enable",
      "pnpm install --frozen-lockfile",
      "pnpm exec agentgate check --strict",
      "pnpm exec agentgate policy test --cases examples/policy-tests/basic.agentgate-tests.yml",
      "pnpm smoke:package",
      "pnpm smoke:install"
    ]));
    expect(workflowText).toContain("AGENTGATE_AUDIT_PATH");
  });

  it("documents the reusable gate workflow and keeps referenced paths valid", () => {
    const doc = fs.readFileSync(path.resolve("docs/integrations/coding-agents.md"), "utf8");

    expect(doc).toContain("examples/github-actions/agentgate-gate.yml");
    expect(doc).toContain("pnpm exec agentgate check --strict");
    expect(doc).toContain("pnpm smoke:package");
    expect(doc).toContain("pnpm smoke:install");

    const referencedPaths = [...doc.matchAll(/`((?:docs|examples)\/[^`]+)`/g)]
      .map((match) => match[1])
      .filter((referencedPath): referencedPath is string => referencedPath !== undefined);

    expect(referencedPaths).toContain("examples/github-actions/agentgate-gate.yml");
    for (const referencedPath of referencedPaths) {
      expect(fs.existsSync(path.resolve(referencedPath))).toBe(true);
    }
  });
});
