import { balancedPolicy } from "./balanced.js";
import type { AgentGatePolicy } from "../core/policy.js";

export const strictPolicy = (): AgentGatePolicy => {
  const policy = balancedPolicy();
  return {
    ...policy,
    workspace: {
      ...policy.workspace,
      writable: ["src/**", "tests/**", "docs/**"]
    },
    rules: [
      ...policy.rules,
      {
        id: "ask-medium-shell",
        effect: "ask",
        tools: ["shell.exec"],
        commandRisk: {
          min: "medium"
        },
        reason: "Medium-risk shell commands require approval in strict mode"
      }
    ]
  };
};
