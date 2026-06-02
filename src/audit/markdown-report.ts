import type { AuditRecord } from "./audit-record.js";

const row = (record: AuditRecord): string => {
  const event = record.event.path ?? record.event.url ?? record.event.command?.join(" ") ?? record.event.toolName;
  return `- ${record.timestamp} \`${record.decision.effect.toUpperCase()}\` \`${record.event.toolName}\` ${event} - ${record.decision.reason}`;
};

export const renderAuditMarkdown = (records: AuditRecord[]): string => {
  const denied = records.filter((record) => record.decision.effect === "deny");
  const asked = records.filter((record) => record.decision.effect === "ask");
  const allowed = records.filter((record) => record.decision.effect === "allow");
  const redactions = records.flatMap((record) => record.decision.redactions);

  return [
    "# AgentGate Audit Report",
    "",
    "## Summary",
    "",
    `- Total events: ${records.length}`,
    `- Denied: ${denied.length}`,
    `- Asked: ${asked.length}`,
    `- Allowed: ${allowed.length}`,
    `- Redactions: ${redactions.length}`,
    "",
    "## Denied",
    "",
    ...(denied.length > 0 ? denied.map(row) : ["- None"]),
    "",
    "## Asked",
    "",
    ...(asked.length > 0 ? asked.map(row) : ["- None"]),
    "",
    "## Allowed",
    "",
    ...(allowed.length > 0 ? allowed.map(row) : ["- None"]),
    "",
    "## Redactions",
    "",
    ...(redactions.length > 0 ? redactions.map((item) => `- ${item.field}: ${item.pattern}`) : ["- None"]),
    ""
  ].join("\n");
};
