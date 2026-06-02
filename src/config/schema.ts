import { z } from "zod";

const decisionEffectSchema = z.enum(["allow", "deny", "ask", "redact"]);
const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const policyRuleSchema = z.object({
  id: z.string().min(1),
  effect: decisionEffectSchema,
  tools: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
  commandRisk: z.object({ min: riskLevelSchema }).optional(),
  urls: z.object({
    denyPrivateNetworks: z.boolean().optional(),
    denyLinkLocal: z.boolean().optional(),
    denyLoopback: z.boolean().optional()
  }).optional(),
  reason: z.string().optional()
});

export const agentGatePolicySchema = z.object({
  version: z.literal(1),
  mode: z.enum(["monitor", "enforce", "ask"]),
  workspace: z.object({
    root: z.string(),
    readable: z.array(z.string()),
    writable: z.array(z.string()),
    neverRead: z.array(z.string())
  }),
  audit: z.object({
    path: z.string(),
    redactSecrets: z.boolean()
  }),
  approval: z.object({
    mode: z.enum(["terminal", "none"])
  }),
  rules: z.array(policyRuleSchema),
  mcp: z.object({
    upstreams: z.record(z.string(), z.object({
      command: z.string(),
      args: z.array(z.string())
    }))
  }).optional()
});
