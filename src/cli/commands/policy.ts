import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import { PolicyEngine } from "../../core/engine.js";
import type { ToolEvent } from "../../core/event.js";

interface ExplainOptions {
  config?: string;
  event: string;
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
};
