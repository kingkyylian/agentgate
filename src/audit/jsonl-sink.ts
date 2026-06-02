import fs from "node:fs";
import path from "node:path";
import type { AuditRecord } from "./audit-record.js";
import { redactUnknown } from "../util/redaction.js";

const redactRecord = (record: AuditRecord): AuditRecord => {
  const input = redactUnknown("event.input", record.event.input);
  const output = redactUnknown("event.outputPreview", record.event.outputPreview);
  const command = record.event.command ? redactUnknown("event.command", record.event.command.join(" ")) : { value: undefined, matches: [] };

  const commandValue = typeof command.value === "string" ? command.value.split(" ") : record.event.command;

  return {
    ...record,
    event: {
      ...record.event,
      ...(input.matches.length > 0 ? { input: input.value } : {}),
      ...(output.matches.length > 0 ? { outputPreview: String(output.value) } : {}),
      ...(command.matches.length > 0 && commandValue ? { command: commandValue } : {})
    },
    decision: {
      ...record.decision,
      redactions: [...record.decision.redactions, ...input.matches, ...output.matches, ...command.matches]
    }
  };
};

export const appendAuditRecord = (auditPath: string, record: AuditRecord, redactSecrets: boolean): void => {
  const target = path.resolve(record.event.cwd, auditPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const safeRecord = redactSecrets ? redactRecord(record) : record;
  fs.appendFileSync(target, `${JSON.stringify(safeRecord)}\n`, "utf8");
};

export const readAuditRecords = (auditPath: string, cwd: string): AuditRecord[] => {
  const target = path.resolve(cwd, auditPath);
  if (!fs.existsSync(target)) return [];

  return fs.readFileSync(target, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRecord);
};
