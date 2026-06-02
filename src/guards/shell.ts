import type { PolicyDecision, RiskLevel } from "../core/decision.js";
import { allowDecision, askDecision, denyDecision, riskRank } from "../core/decision.js";
import type { ToolEvent } from "../core/event.js";
import type { AgentGatePolicy } from "../core/policy.js";

export interface ShellRisk {
  risk: RiskLevel;
  reason: string;
}

const joinedCommand = (command: string[]): string => command.join(" ").trim();

export const classifyShellCommand = (command: string[]): ShellRisk => {
  const joined = joinedCommand(command);
  const lower = joined.toLowerCase();

  if (/\brm\s+-[^\s]*r[^\s]*f[^\s]*\s+(?:\/|~)(?:\s|$)/.test(lower)) {
    return { risk: "critical", reason: "Recursive forced deletion of root or home is critical" };
  }
  if (/\b(?:mkfs|shutdown|reboot)\b/.test(lower)) {
    return { risk: "critical", reason: "System-level destructive command is critical" };
  }
  if (/\bdd\b.*\bof=\/dev\//.test(lower)) {
    return { risk: "critical", reason: "Writing raw data to a device is critical" };
  }
  if (/\bchmod\s+-r\s+777\s+\/(?:\s|$)/.test(lower) || /\bchown\s+-r\b.*\s\/(?:\s|$)/.test(lower)) {
    return { risk: "critical", reason: "Recursive permission change at root is critical" };
  }
  if (/\b(?:curl|wget)\b.*\|\s*(?:sh|bash)\b/.test(lower) || /bash\s+<\s*\(\s*curl\b/.test(lower)) {
    return { risk: "high", reason: "Remote install script piped into shell" };
  }
  if (/\bnc\b.*\s-e\s/.test(lower)) {
    return { risk: "high", reason: "Netcat exec mode can expose a shell" };
  }
  if (/stricthostkeychecking=no/.test(lower)) {
    return { risk: "high", reason: "SSH host key checking disabled" };
  }
  if (/\bcat\s+(?:\.env|.*\/\.env|.*id_rsa|.*id_ed25519)\b/.test(lower)) {
    return { risk: "high", reason: "Command attempts to print secrets" };
  }
  if (/\b(?:npm|pnpm|yarn|pip|brew)\s+install\b/.test(lower)) {
    return { risk: "medium", reason: "Dependency installation changes local environment" };
  }
  if (/\bdocker\s+run\b.*--privileged\b/.test(lower)) {
    return { risk: "medium", reason: "Privileged container run" };
  }
  if (/\bgit\s+push\b/.test(lower)) {
    return { risk: "medium", reason: "Git push changes remote state" };
  }
  if (/\bgh\s+auth\s+token\b/.test(lower)) {
    return { risk: "medium", reason: "Command can expose GitHub token" };
  }

  return { risk: "low", reason: "Command matches low-risk heuristics" };
};

export const evaluateShellEvent = (policy: AgentGatePolicy, event: ToolEvent): PolicyDecision => {
  if (event.kind !== "shell.exec") return allowDecision("Not a shell event");
  if (!event.command || event.command.length === 0) {
    return denyDecision("shell-missing-command", "Shell event is missing command tokens", "high");
  }

  const classification = classifyShellCommand(event.command);
  if (classification.risk === "critical") {
    return denyDecision("shell-critical-risk", classification.reason, "critical");
  }

  const askRule = policy.rules.find((rule) => {
    if (!rule.commandRisk) return false;
    if (rule.tools && !rule.tools.includes("shell.exec")) return false;
    return riskRank[classification.risk] >= riskRank[rule.commandRisk.min];
  });

  if (askRule) {
    if (askRule.effect === "deny") return denyDecision(askRule.id, askRule.reason ?? classification.reason, classification.risk);
    if (askRule.effect === "ask") return askDecision(askRule.id, askRule.reason ?? classification.reason, classification.risk);
  }

  return allowDecision(classification.reason);
};
