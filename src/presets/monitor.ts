import { balancedPolicy } from "./balanced.js";
import type { AgentGatePolicy } from "../core/policy.js";

export const monitorPolicy = (): AgentGatePolicy => ({
  ...balancedPolicy(),
  mode: "monitor",
  approval: {
    mode: "none"
  }
});
