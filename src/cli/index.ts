#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./commands/check.js";
import { registerDemoCommand } from "./commands/demo.js";
import { registerExecCommand } from "./commands/exec.js";
import { registerInitCommand } from "./commands/init.js";
import { registerLogsCommand } from "./commands/logs.js";
import { registerMcpProxyCommand } from "./commands/mcp-proxy.js";
import { registerPolicyCommand } from "./commands/policy.js";

const program = new Command();

program
  .name("agentgate")
  .description("A local firewall for AI coding agents and MCP tools.")
  .version("0.1.0");

registerInitCommand(program);
registerCheckCommand(program);
registerDemoCommand(program);
registerExecCommand(program);
registerLogsCommand(program);
registerMcpProxyCommand(program);
registerPolicyCommand(program);

program.showHelpAfterError();

await program.parseAsync(process.argv);
