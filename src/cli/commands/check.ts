import path from "node:path";
import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";

interface CheckOptions {
  config?: string;
}

export const registerCheckCommand = (program: Command): void => {
  program
    .command("check")
    .description("Validate AgentGate policy and local runtime assumptions.")
    .option("--config <path>", "Path to agentgate.yml")
    .action((options: CheckOptions) => {
      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) {
        console.error("FAIL no agentgate.yml found");
        process.exitCode = 1;
        return;
      }

      const root = path.resolve(path.dirname(loaded.path), loaded.policy.workspace.root);
      const checks = [
        ["policy", "valid"],
        ["mode", loaded.policy.mode],
        ["workspace", root],
        ["audit", loaded.policy.audit.path],
        ["rules", String(loaded.policy.rules.length)]
      ];

      for (const [name, value] of checks) {
        console.log(`PASS ${name}: ${value}`);
      }
    });
};
