export type DecisionEffect = "allow" | "deny" | "ask" | "redact";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyDecision {
  effect: DecisionEffect;
  risk: RiskLevel;
  ruleId: string;
  reason: string;
  redactions: Array<{
    field: string;
    pattern: string;
  }>;
  warnings: string[];
}

export const riskRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export const allowDecision = (reason = "No blocking rule matched"): PolicyDecision => ({
  effect: "allow",
  risk: "low",
  ruleId: "default-allow",
  reason,
  redactions: [],
  warnings: []
});

export const denyDecision = (ruleId: string, reason: string, risk: RiskLevel = "critical"): PolicyDecision => ({
  effect: "deny",
  risk,
  ruleId,
  reason,
  redactions: [],
  warnings: []
});

export const askDecision = (ruleId: string, reason: string, risk: RiskLevel = "high"): PolicyDecision => ({
  effect: "ask",
  risk,
  ruleId,
  reason,
  redactions: [],
  warnings: []
});
