import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { agentGatePolicySchema } from "./schema.js";
import type { AgentGatePolicy } from "../core/policy.js";

export interface LoadedPolicy {
  path: string;
  policy: AgentGatePolicy;
}

export const findPolicyPath = (cwd: string): string | null => {
  let current = path.resolve(cwd);

  while (true) {
    const candidate = path.join(current, "agentgate.yml");
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
};

export const loadPolicyFromPath = (policyPath: string): LoadedPolicy => {
  const raw = fs.readFileSync(policyPath, "utf8");
  const parsed = parse(raw);
  const result = agentGatePolicySchema.safeParse(parsed);

  if (!result.success) {
    const message = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid AgentGate policy at ${policyPath}: ${message}`);
  }

  return {
    path: policyPath,
    policy: result.data as AgentGatePolicy
  };
};

export const loadPolicy = (cwd: string, explicitPath?: string): LoadedPolicy | null => {
  const policyPath = explicitPath ? path.resolve(cwd, explicitPath) : findPolicyPath(cwd);
  if (!policyPath) return null;
  return loadPolicyFromPath(policyPath);
};
