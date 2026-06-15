import type { AgentGatePolicy } from "../core/policy.js";

export type McpLaunchMode = "global" | "local" | "npx";

export interface McpClientConfig {
  mcpServers: Record<string, {
    command: string;
    args: string[];
  }>;
}

export interface McpSetupOptions {
  configPath: string;
  launch: McpLaunchMode;
  serverName: string;
}

export const mcpLaunchModes: McpLaunchMode[] = ["global", "local", "npx"];

export const parseMcpLaunchMode = (value: string): McpLaunchMode => {
  if (mcpLaunchModes.includes(value as McpLaunchMode)) return value as McpLaunchMode;
  throw new Error(`Unsupported MCP launch mode: ${value}. Expected global, local, or npx.`);
};

export const resolveMcpServerName = (policy: AgentGatePolicy, requestedName?: string): string => {
  const upstreams = policy.mcp?.upstreams ?? {};
  const names = Object.keys(upstreams);

  if (requestedName !== undefined) {
    if (upstreams[requestedName] !== undefined) return requestedName;
    const hint = names.length > 0 ? ` Available upstreams: ${names.join(", ")}` : " No MCP upstreams are configured.";
    throw new Error(`No MCP upstream named "${requestedName}" configured in agentgate.yml.${hint}`);
  }

  if (names.length === 1 && names[0] !== undefined) return names[0];
  if (names.length === 0) throw new Error("No MCP upstreams are configured in agentgate.yml.");
  throw new Error(`Multiple MCP upstreams configured. Pass --server <name>. Available upstreams: ${names.join(", ")}`);
};

export const buildMcpClientConfig = (options: McpSetupOptions): McpClientConfig => {
  const proxyArgs = ["mcp-proxy", "--config", options.configPath, "--server", options.serverName];
  const serverConfig = options.launch === "global"
    ? {
        command: "agentgate",
        args: proxyArgs
      }
    : options.launch === "local"
      ? {
          command: "node",
          args: ["dist/cli/index.js", ...proxyArgs]
        }
      : {
          command: "npx",
          args: ["-y", "@kingkyylian/agentgate@latest", ...proxyArgs]
        };

  return {
    mcpServers: {
      [`agentgate-${options.serverName}`]: serverConfig
    }
  };
};
