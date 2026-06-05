import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import { McpProxy } from "../../mcp/proxy.js";

interface McpProxyOptions {
  config?: string;
  server?: string;
}

export const registerMcpProxyCommand = (program: Command): void => {
  program
    .command("mcp-proxy")
    .description("Run a stdio MCP proxy that enforces AgentGate policy.")
    .option("--config <path>", "Path to agentgate.yml")
    .option("--server <name>", "Configured upstream server name")
    .action((options: McpProxyOptions) => {
      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

      const proxy = new McpProxy({
        policy: loaded.policy,
        policyPath: loaded.path,
        cwd: process.cwd(),
        ...(options.server ? { serverName: options.server } : {}),
        onChildError: (message, error) => {
          process.stderr.write(`${message}: ${error.message}\n`);
          process.exit(1);
        }
      });
      proxy.start();
    });
};
