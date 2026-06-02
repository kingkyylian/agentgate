import picomatch from "picomatch";
import type { PolicyDecision } from "./decision.js";
import { allowDecision, askDecision, denyDecision, riskRank } from "./decision.js";
import type { EvaluationContext } from "./context.js";
import type { ToolEvent } from "./event.js";
import type { AgentGatePolicy, PolicyRule } from "./policy.js";
import { evaluateFilesystemEvent } from "../guards/filesystem.js";
import { evaluateHttpEvent } from "../guards/http.js";
import { normalizeMcpToolEvent } from "../guards/mcp.js";
import { evaluateSecretEvent } from "../guards/secret.js";
import { classifyShellCommand, evaluateShellEvent } from "../guards/shell.js";

const toolMatches = (rule: PolicyRule, event: ToolEvent): boolean => {
  if (!rule.tools || rule.tools.length === 0) return true;
  return rule.tools.includes(event.kind) || rule.tools.includes(event.toolName);
};

const pathMatches = (rule: PolicyRule, event: ToolEvent): boolean => {
  if (!rule.paths || rule.paths.length === 0) return true;
  if (!event.path) return false;
  return rule.paths.some((pattern) => picomatch.isMatch(event.path ?? "", pattern, { dot: true }));
};

const explicitRuleDecision = (rule: PolicyRule, event: ToolEvent): PolicyDecision | undefined => {
  if (rule.urls) return undefined;
  if (!toolMatches(rule, event)) return undefined;
  if (!pathMatches(rule, event)) return undefined;

  if (rule.commandRisk) {
    if (!event.command) return undefined;
    const commandRisk = classifyShellCommand(event.command);
    if (riskRank[commandRisk.risk] < riskRank[rule.commandRisk.min]) return undefined;
  }

  if (rule.effect === "deny") return denyDecision(rule.id, rule.reason ?? `Matched rule ${rule.id}`);
  if (rule.effect === "ask") return askDecision(rule.id, rule.reason ?? `Matched rule ${rule.id}`);
  if (rule.effect === "redact") {
    return {
      effect: "redact",
      risk: "medium",
      ruleId: rule.id,
      reason: rule.reason ?? `Matched rule ${rule.id}`,
      redactions: [],
      warnings: []
    };
  }

  return allowDecision(rule.reason ?? `Matched rule ${rule.id}`);
};

export class PolicyEngine {
  constructor(private readonly policy: AgentGatePolicy) {}

  evaluate(event: ToolEvent, context: EvaluationContext): PolicyDecision {
    const normalized = normalizeMcpToolEvent(event);
    const secretDecision = this.policy.audit.redactSecrets ? evaluateSecretEvent(normalized) : undefined;

    for (const rule of this.policy.rules) {
      const decision = explicitRuleDecision(rule, normalized);
      if (!decision) continue;
      if (secretDecision?.effect === "redact") decision.redactions.push(...secretDecision.redactions);
      return this.applyMode(decision);
    }

    let decision: PolicyDecision;
    if (normalized.kind === "fs.read" || normalized.kind === "fs.write") {
      decision = evaluateFilesystemEvent(this.policy, normalized, context);
    } else if (normalized.kind === "shell.exec") {
      decision = evaluateShellEvent(this.policy, normalized);
    } else if (normalized.kind === "http.fetch") {
      decision = evaluateHttpEvent(this.policy, normalized);
    } else {
      decision = allowDecision("MCP tool has no matching high-risk mapping");
    }

    if (secretDecision?.effect === "redact") {
      decision.redactions.push(...secretDecision.redactions);
      if (decision.effect === "allow") {
        decision = {
          ...secretDecision,
          warnings: decision.warnings
        };
      }
    }

    return this.applyMode(decision);
  }

  private applyMode(decision: PolicyDecision): PolicyDecision {
    if (this.policy.mode === "monitor" && decision.effect !== "allow" && decision.effect !== "redact") {
      return {
        ...decision,
        effect: "allow",
        warnings: [`Monitor mode would have ${decision.effect}ed this event`]
      };
    }

    if (this.policy.mode === "ask" && decision.effect === "deny" && decision.risk !== "critical") {
      return {
        ...decision,
        effect: "ask"
      };
    }

    return decision;
  }
}
