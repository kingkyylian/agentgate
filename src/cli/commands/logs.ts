import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import { readAuditRecords } from "../../audit/jsonl-sink.js";
import { renderAuditMarkdown, renderAuditReviewMarkdown } from "../../audit/markdown-report.js";
import type { AuditRecord } from "../../audit/audit-record.js";

interface LogsOptions {
  config?: string;
  format?: string;
  review?: boolean;
  effect?: string;
  limit?: string;
}

type AuditEffect = AuditRecord["decision"]["effect"];

const reviewEffects = new Set<AuditEffect>(["deny", "ask", "redact"]);
const validEffects = new Set<AuditEffect>(["allow", "deny", "ask", "redact"]);

const parseEffects = (value?: string): Set<AuditEffect> | null => {
  if (value === undefined) return null;

  const effects = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (effects.length === 0) throw new Error("At least one audit effect is required.");

  for (const effect of effects) {
    if (!validEffects.has(effect as AuditEffect)) {
      throw new Error(`Unsupported audit effect: ${effect}. Expected allow, deny, ask, or redact.`);
    }
  }

  return new Set(effects as AuditEffect[]);
};

const parseLimit = (value?: string): number | null => {
  if (value === undefined) return null;

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Unsupported audit limit: ${value}. Expected a positive integer.`);
  }

  return limit;
};

const filterAuditRecords = (records: AuditRecord[], options: LogsOptions): AuditRecord[] => {
  const effects = parseEffects(options.effect);
  const limit = parseLimit(options.limit);
  let outputRecords = options.review === true
    ? records.filter((record) => reviewEffects.has(record.decision.effect))
    : records;

  if (effects !== null) {
    outputRecords = outputRecords.filter((record) => effects.has(record.decision.effect));
  }

  if (limit !== null) {
    outputRecords = outputRecords.slice(-limit);
  }

  return outputRecords;
};

export const registerLogsCommand = (program: Command): void => {
  program
    .command("logs")
    .description("Render AgentGate audit logs.")
    .option("--config <path>", "Path to agentgate.yml")
    .option("--format <format>", "markdown or jsonl", "markdown")
    .option("--review", "Show only denied, asked, and redacted events for audit review.")
    .option("--effect <effects>", "Comma-separated decision effects to include: allow, deny, ask, redact.")
    .option("--limit <count>", "Show only the most recent matching audit records.")
    .action((options: LogsOptions) => {
      if (options.format !== undefined && !["markdown", "jsonl"].includes(options.format)) {
        throw new Error(`Unsupported logs format: ${options.format}. Expected markdown or jsonl.`);
      }

      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

      const records = readAuditRecords(loaded.policy.audit.path, process.cwd());
      const outputRecords = filterAuditRecords(records, options);
      if (options.format === "jsonl") {
        for (const record of outputRecords) console.log(JSON.stringify(record));
        return;
      }

      console.log(options.review === true ? renderAuditReviewMarkdown(outputRecords) : renderAuditMarkdown(outputRecords));
    });
};
