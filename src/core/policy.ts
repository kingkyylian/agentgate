import type { DecisionEffect, RiskLevel } from "./decision.js";
import type { ToolKind } from "./event.js";

export interface PolicyRule {
  id: string;
  effect: DecisionEffect;
  tools?: Array<ToolKind | string>;
  paths?: string[];
  commandRisk?: {
    min: RiskLevel;
  };
  urls?: {
    denyPrivateNetworks?: boolean;
    denyLinkLocal?: boolean;
    denyLoopback?: boolean;
  };
  reason?: string;
}

export interface McpUpstreamConfig {
  command: string;
  args: string[];
}

export interface AgentGatePolicy {
  version: 1;
  mode: "monitor" | "enforce" | "ask";
  workspace: {
    root: string;
    readable: string[];
    writable: string[];
    neverRead: string[];
  };
  audit: {
    path: string;
    redactSecrets: boolean;
  };
  approval: {
    mode: "terminal" | "none";
  };
  rules: PolicyRule[];
  mcp?: {
    upstreams: Record<string, McpUpstreamConfig>;
  };
}
