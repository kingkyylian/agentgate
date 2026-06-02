import type { AgentGatePolicy } from "../core/policy.js";

export interface AgentGateReadiness {
  hasPolicy: boolean;
  policyPath?: string;
  mode?: "monitor" | "enforce" | "ask";
  protectsSecrets: boolean;
  protectsShell: boolean;
  protectsMcp: boolean;
  warnings: string[];
}

export const evaluateAgentGateReadiness = (policy: AgentGatePolicy | null, policyPath?: string): AgentGateReadiness => {
  if (!policy) {
    return {
      hasPolicy: false,
      protectsSecrets: false,
      protectsShell: false,
      protectsMcp: false,
      warnings: ["No agentgate.yml policy found"]
    };
  }

  const protectsSecrets = policy.workspace.neverRead.some((pattern) => pattern.includes(".env") || pattern.includes(".ssh") || pattern.includes("pem"));
  const protectsShell = policy.rules.some((rule) => rule.tools?.includes("shell.exec") && rule.commandRisk && (rule.effect === "ask" || rule.effect === "deny"));
  const protectsMcp = policy.rules.some((rule) => rule.tools?.includes("mcp.tool")) || Boolean(policy.mcp?.upstreams);
  const warnings: string[] = [];

  if (policy.mode === "monitor") warnings.push("Policy is monitor-only; runtime blocking is disabled");
  if (!protectsSecrets) warnings.push("Policy does not clearly protect secret paths");
  if (!protectsShell) warnings.push("Policy does not require approval or denial for risky shell commands");
  if (!protectsMcp) warnings.push("Policy does not include MCP coverage");

  return {
    hasPolicy: true,
    ...(policyPath ? { policyPath } : {}),
    mode: policy.mode,
    protectsSecrets,
    protectsShell,
    protectsMcp,
    warnings
  };
};
