import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { policyForPreset, renderPolicyYaml, type PresetName } from "../../config/defaults.js";

interface InitOptions {
  preset?: PresetName;
  force?: boolean;
}

export const registerInitCommand = (program: Command): void => {
  program
    .command("init")
    .description("Create an agentgate.yml policy file.")
    .option("--preset <preset>", "Policy preset: balanced, strict, monitor", "balanced")
    .option("--force", "Overwrite an existing agentgate.yml")
    .action((options: InitOptions) => {
      const preset = options.preset ?? "balanced";
      if (!["balanced", "strict", "monitor"].includes(preset)) {
        throw new Error(`Unknown preset: ${preset}`);
      }

      const target = path.resolve(process.cwd(), "agentgate.yml");
      if (fs.existsSync(target) && !options.force) {
        throw new Error("agentgate.yml already exists. Use --force to overwrite.");
      }

      const yaml = renderPolicyYaml(policyForPreset(preset));
      fs.writeFileSync(target, yaml, "utf8");
      console.log(`Created ${target}`);
    });
};
