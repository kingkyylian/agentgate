import type { AuditRecord } from "../audit/audit-record.js";

export interface HandoffAgentGateSummary {
  auditPath: string;
  since?: string;
  totals: {
    allowed: number;
    denied: number;
    asked: number;
    redacted: number;
  };
  highRiskEvents: Array<{
    timestamp: string;
    toolName: string;
    effect: "deny" | "ask" | "redact";
    risk: "high" | "critical";
    reason: string;
  }>;
}

export const summarizeForHandoffKit = (auditPath: string, records: AuditRecord[], since?: string): HandoffAgentGateSummary => {
  const filtered = since ? records.filter((record) => record.timestamp >= since) : records;
  const highRiskEvents = filtered.flatMap((record) => {
    const { effect, risk, reason } = record.decision;
    if ((effect === "deny" || effect === "ask" || effect === "redact") && (risk === "high" || risk === "critical")) {
      return [{
        timestamp: record.timestamp,
        toolName: record.event.toolName,
        effect,
        risk,
        reason
      }];
    }
    return [];
  });

  return {
    auditPath,
    ...(since ? { since } : {}),
    totals: {
      allowed: filtered.filter((record) => record.decision.effect === "allow").length,
      denied: filtered.filter((record) => record.decision.effect === "deny").length,
      asked: filtered.filter((record) => record.decision.effect === "ask").length,
      redacted: filtered.filter((record) => record.decision.effect === "redact").length
    },
    highRiskEvents
  };
};
