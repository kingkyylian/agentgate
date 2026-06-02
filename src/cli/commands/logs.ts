import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import { readAuditRecords } from "../../audit/jsonl-sink.js";
import { renderAuditMarkdown } from "../../audit/markdown-report.js";

interface LogsOptions {
  config?: string;
  format?: "markdown" | "jsonl";
}

export const registerLogsCommand = (program: Command): void => {
  program
    .command("logs")
    .description("Render AgentGate audit logs.")
    .option("--config <path>", "Path to agentgate.yml")
    .option("--format <format>", "markdown or jsonl", "markdown")
    .action((options: LogsOptions) => {
      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

      const records = readAuditRecords(loaded.policy.audit.path, process.cwd());
      if (options.format === "jsonl") {
        for (const record of records) console.log(JSON.stringify(record));
        return;
      }

      console.log(renderAuditMarkdown(records));
    });
};
