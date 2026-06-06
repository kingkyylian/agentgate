import type { AuditRecord } from "./audit-record.js";
import { redactText } from "../util/redaction.js";

const row = (record: AuditRecord): string => {
  const event = record.event.path ?? record.event.url ?? record.event.command?.join(" ") ?? record.event.toolName;
  const safeEvent = redactText("audit.event", String(event)).text;
  const safeReason = redactText("audit.reason", record.decision.reason).text;
  const executed = record.executed ? "yes" : "no";
  return `- ${record.timestamp} \`${record.decision.effect.toUpperCase()}\` \`${record.decision.risk}\` \`${record.event.toolName}\` executed:${executed} ${safeEvent} - ${safeReason}`;
};

export const renderAuditMarkdown = (records: AuditRecord[]): string => {
  const denied = records.filter((record) => record.decision.effect === "deny");
  const asked = records.filter((record) => record.decision.effect === "ask");
  const redacted = records.filter((record) => record.decision.effect === "redact");
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
    `- Redacted: ${redacted.length}`,
    `- Allowed: ${allowed.length}`,
    `- Redaction matches: ${redactions.length}`,
    "",
    "## Denied",
    "",
    ...(denied.length > 0 ? denied.map(row) : ["- None"]),
    "",
    "## Asked",
    "",
    ...(asked.length > 0 ? asked.map(row) : ["- None"]),
    "",
    "## Redacted",
    "",
    ...(redacted.length > 0 ? redacted.map(row) : ["- None"]),
    "",
    "## Allowed",
    "",
    ...(allowed.length > 0 ? allowed.map(row) : ["- None"]),
    "",
    "## Redaction Matches",
    "",
    ...(redactions.length > 0 ? redactions.map((item) => `- ${item.field}: ${item.pattern}`) : ["- None"]),
    ""
  ].join("\n");
};

export const renderAuditReviewMarkdown = (records: AuditRecord[]): string => {
  const reviewRecords = records.filter((record) => ["deny", "ask", "redact"].includes(record.decision.effect));
  const denied = reviewRecords.filter((record) => record.decision.effect === "deny");
  const asked = reviewRecords.filter((record) => record.decision.effect === "ask");
  const redacted = reviewRecords.filter((record) => record.decision.effect === "redact");

  return [
    "# AgentGate Audit Review",
    "",
    "## Summary",
    "",
    `- Review events: ${reviewRecords.length}`,
    `- Denied: ${denied.length}`,
    `- Asked: ${asked.length}`,
    `- Redacted: ${redacted.length}`,
    "",
    "## Needs Review",
    "",
    ...(reviewRecords.length > 0 ? reviewRecords.map(row) : ["- None"]),
    "",
    "## Next Steps",
    "",
    "- Inspect denied events before re-running blocked tools.",
    "- Resolve asked events before approving equivalent future actions.",
    "- Confirm redacted fields do not remove context needed for handoff or debugging.",
    ""
  ].join("\n");
};
