import type { PolicyDecision } from "../core/decision.js";
import { allowDecision } from "../core/decision.js";
import type { ToolEvent } from "../core/event.js";
import { redactText, redactUnknown } from "../util/redaction.js";

export const evaluateSecretEvent = (event: ToolEvent): PolicyDecision => {
  const redactions: PolicyDecision["redactions"] = [];

  if (event.command) {
    const result = redactText("command", event.command.join(" "));
    redactions.push(...result.matches);
  }

  if (event.input !== undefined) {
    const result = redactUnknown("input", event.input);
    redactions.push(...result.matches);
  }

  if (event.outputPreview !== undefined) {
    const result = redactText("outputPreview", event.outputPreview);
    redactions.push(...result.matches);
  }

  if (redactions.length === 0) return allowDecision("No secrets detected");

  return {
    effect: "redact",
    risk: "medium",
    ruleId: "secret-redaction",
    reason: "Potential secrets detected and redacted",
    redactions,
    warnings: []
  };
};
