import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { parse } from "yaml";
import { loadPolicy } from "../../config/loader.js";
import { PolicyEngine } from "../../core/engine.js";
import type { ToolEvent } from "../../core/event.js";
import { policyFixtureFileSchema, runPolicyFixtureCases } from "../../policy/fixtures.js";

interface ExplainOptions {
  config?: string;
  event: string;
}

interface TestOptions {
  config?: string;
  cases: string;
}

export const registerPolicyCommand = (program: Command): void => {
  const policy = program
    .command("policy")
    .description("Inspect AgentGate policy behavior.");

  policy
    .command("explain")
    .description("Explain the decision for a JSON ToolEvent file.")
    .requiredOption("--event <path>", "Path to ToolEvent JSON")
    .option("--config <path>", "Path to agentgate.yml")
    .action((options: ExplainOptions) => {
      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

      const event = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), options.event), "utf8")) as ToolEvent;
      const decision = new PolicyEngine(loaded.policy).evaluate(event, {
        workspaceRoot: path.resolve(path.dirname(loaded.path), loaded.policy.workspace.root),
        now: new Date()
      });

      console.log(JSON.stringify(decision, null, 2));
    });

  policy
    .command("test")
    .description("Run policy fixture cases against agentgate.yml.")
    .requiredOption("--cases <path>", "Path to policy fixture YAML")
    .option("--config <path>", "Path to agentgate.yml")
    .action((options: TestOptions) => {
      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

      const casesPath = path.resolve(process.cwd(), options.cases);
      const parsed = parse(fs.readFileSync(casesPath, "utf8"));
      const fixture = policyFixtureFileSchema.parse(parsed);
      const workspaceRoot = path.resolve(path.dirname(loaded.path), loaded.policy.workspace.root);
      const result = runPolicyFixtureCases(fixture, loaded.policy, {
        workspaceRoot,
        cwd: workspaceRoot,
        now: new Date()
      });

      for (const item of result.cases) {
        const prefix = item.ok ? "PASS" : "FAIL";
        console.log(`${prefix} ${item.name}: ${item.actual.effect} ${item.actual.ruleId}`);
        for (const failure of item.failures) console.log(`  - ${failure}`);
      }
      console.log(`Policy tests: ${result.passed} passed, ${result.failed} failed`);

      if (!result.ok) {
        process.exitCode = 1;
      }
    });
};
