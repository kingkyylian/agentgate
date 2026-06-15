import path from "node:path";
import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import { buildMcpClientConfig, parseMcpLaunchMode, resolveMcpServerName } from "../../mcp/setup.js";

interface McpSetupCommandOptions {
  config?: string;
  launch: string;
  server?: string;
}

const configArgumentForClient = (cwd: string, loadedPath: string, explicitPath?: string): string => {
  if (explicitPath !== undefined) return explicitPath;
  const relativePath = path.relative(cwd, loadedPath);
  return relativePath.length > 0 ? relativePath : "agentgate.yml";
};

export const registerMcpCommand = (program: Command): void => {
  const mcp = program
    .command("mcp")
    .description("Generate MCP client integration config.");

  mcp
    .command("setup")
    .description("Print MCP client config for an AgentGate proxy.")
    .option("--config <path>", "Path to agentgate.yml")
    .option("--server <name>", "Configured upstream server name")
    .option("--launch <mode>", "Launch shape: global, local, or npx", "global")
    .action((options: McpSetupCommandOptions) => {
      try {
        const loaded = loadPolicy(process.cwd(), options.config);
        if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

        const serverName = resolveMcpServerName(loaded.policy, options.server);
        const config = buildMcpClientConfig({
          configPath: configArgumentForClient(process.cwd(), loaded.path, options.config),
          launch: parseMcpLaunchMode(options.launch),
          serverName
        });

        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`FAIL mcp setup: ${message}\n`);
        process.exitCode = 1;
      }
    });
};
