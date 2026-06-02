import path from "node:path";
import { execa } from "execa";
import type { Command } from "commander";
import { appendAuditRecord } from "../../audit/jsonl-sink.js";
import { requestTerminalApproval } from "../../approval/terminal.js";
import { loadPolicy } from "../../config/loader.js";
import { PolicyEngine } from "../../core/engine.js";
import type { ToolEvent } from "../../core/event.js";
import { stableId } from "../../util/stable-id.js";

interface ExecOptions {
  config?: string;
  yes?: boolean;
}

export const registerExecCommand = (program: Command): void => {
  program
    .command("exec")
    .description("Evaluate and run a local command under AgentGate policy.")
    .allowUnknownOption(true)
    .option("--config <path>", "Path to agentgate.yml")
    .option("--yes", "Allow ask decisions for this local command")
    .argument("[command...]", "Command and arguments after --")
    .action(async (command: string[], options: ExecOptions) => {
      if (command.length === 0) throw new Error("Missing command. Usage: agentgate exec -- npm test");

      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) throw new Error("No agentgate.yml found. Run agentgate init first.");

      const event: ToolEvent = {
        id: stableId("evt", { command, cwd: process.cwd() }),
        timestamp: new Date().toISOString(),
        kind: "shell.exec",
        toolName: "shell.exec",
        cwd: process.cwd(),
        command,
        metadata: {}
      };
      const engine = new PolicyEngine(loaded.policy);
      const started = Date.now();
      let decision = engine.evaluate(event, {
        workspaceRoot: path.resolve(path.dirname(loaded.path), loaded.policy.workspace.root),
        now: new Date()
      });

      if (decision.effect === "ask") {
        if (options.yes) {
          decision = {
            ...decision,
            effect: "allow",
            warnings: [...decision.warnings, "Allowed by --yes for local exec"]
          };
        } else {
          const approval = await requestTerminalApproval(event, decision);
          if (!approval.allowed) {
            decision = {
              ...decision,
              effect: "deny",
              reason: approval.reason
            };
          }
        }
      }

      if (decision.effect === "deny") {
        appendAuditRecord(loaded.policy.audit.path, {
          id: event.id,
          timestamp: event.timestamp,
          event,
          decision,
          durationMs: Date.now() - started,
          executed: false
        }, loaded.policy.audit.redactSecrets);
        console.error(`DENY ${decision.ruleId}: ${decision.reason}`);
        process.exitCode = 2;
        return;
      }

      appendAuditRecord(loaded.policy.audit.path, {
        id: event.id,
        timestamp: event.timestamp,
        event,
        decision,
        durationMs: Date.now() - started,
        executed: true
      }, loaded.policy.audit.redactSecrets);

      const [bin, ...args] = command;
      if (!bin) throw new Error("Missing executable");
      const result = await execa(bin, args, { stdio: "inherit", reject: false });
      process.exitCode = result.exitCode;
    });
};
