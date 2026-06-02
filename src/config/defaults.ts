import { stringify } from "yaml";
import { balancedPolicy } from "../presets/balanced.js";
import { monitorPolicy } from "../presets/monitor.js";
import { strictPolicy } from "../presets/strict.js";
import type { AgentGatePolicy } from "../core/policy.js";

export type PresetName = "balanced" | "strict" | "monitor";

export const policyForPreset = (preset: PresetName): AgentGatePolicy => {
  if (preset === "strict") return strictPolicy();
  if (preset === "monitor") return monitorPolicy();
  return balancedPolicy();
};

export const renderPolicyYaml = (policy: AgentGatePolicy): string => stringify(policy);
