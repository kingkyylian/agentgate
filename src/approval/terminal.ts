import readline from "node:readline/promises";
import process from "node:process";
import type { PolicyDecision } from "../core/decision.js";
import type { ToolEvent } from "../core/event.js";

export interface ApprovalResult {
  allowed: boolean;
  reason: string;
}

export const requestTerminalApproval = async (
  event: ToolEvent,
  decision: PolicyDecision,
  input = process.stdin,
  output = process.stderr
): Promise<ApprovalResult> => {
  if (!input.isTTY || !output.isTTY) {
    return {
      allowed: false,
      reason: "Non-interactive ask decision denied by default"
    };
  }

  const rl = readline.createInterface({ input, output });
  const target = event.path ?? event.url ?? event.command?.join(" ") ?? event.toolName;
  output.write(`AgentGate approval required\n`);
  output.write(`Risk: ${decision.risk}\n`);
  output.write(`Rule: ${decision.ruleId}\n`);
  output.write(`Reason: ${decision.reason}\n`);
  output.write(`Event: ${event.kind} ${target}\n`);

  const answer = (await rl.question("[a] allow once, [d] deny: ")).trim().toLowerCase();
  rl.close();

  if (answer === "a" || answer === "allow") {
    return {
      allowed: true,
      reason: "User allowed once"
    };
  }

  return {
    allowed: false,
    reason: "User denied"
  };
};
