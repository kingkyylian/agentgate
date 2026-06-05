import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import type { AgentGatePolicy, McpUpstreamConfig } from "../core/policy.js";
import { PolicyEngine } from "../core/engine.js";
import { appendAuditRecord } from "../audit/jsonl-sink.js";
import { toolCallToEvent, type JsonRpcRequest } from "./tool-map.js";
import { forwardChildOutput, wireLineReader, writeJsonLine } from "./transport.js";

export interface McpProxyOptions {
  policy: AgentGatePolicy;
  policyPath: string;
  cwd: string;
  serverName?: string;
  onChildError?: (message: string, error: Error) => void;
}

const firstUpstream = (policy: AgentGatePolicy, requestedName?: string): { name: string; config: McpUpstreamConfig } => {
  const upstreams = policy.mcp?.upstreams ?? {};
  const name = requestedName ?? Object.keys(upstreams)[0];
  const config = name ? upstreams[name] : undefined;
  if (requestedName && !config) {
    const available = Object.keys(upstreams);
    const hint = available.length > 0 ? ` Available upstreams: ${available.join(", ")}` : " No MCP upstreams are configured.";
    throw new Error(`No MCP upstream named "${requestedName}" configured in agentgate.yml.${hint}`);
  }
  if (!name || !config) throw new Error("No MCP upstream configured in agentgate.yml");
  return { name, config };
};

export class McpProxy {
  private child: ChildProcessWithoutNullStreams | null = null;

  constructor(private readonly options: McpProxyOptions) {}

  start(): void {
    const upstream = firstUpstream(this.options.policy, this.options.serverName);
    this.child = spawn(upstream.config.command, upstream.config.args, {
      cwd: this.options.cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.child.on("error", (error) => this.handleChildError(upstream.name, error));

    forwardChildOutput(this.child, process.stdout);

    const input = wireLineReader(process.stdin);
    input.on("line", (line) => this.handleLine(upstream.name, line));
  }

  evaluateRequest(serverName: string, request: JsonRpcRequest): { allowed: boolean; error?: unknown } {
    const event = toolCallToEvent(serverName, request, this.options.cwd);
    if (!event) return { allowed: true };

    const started = Date.now();
    const decision = new PolicyEngine(this.options.policy).evaluate(event, {
      workspaceRoot: path.resolve(path.dirname(this.options.policyPath), this.options.policy.workspace.root),
      now: new Date()
    });

    const allowed = decision.effect === "allow" || decision.effect === "redact";
    appendAuditRecord(this.options.policy.audit.path, {
      id: event.id,
      timestamp: event.timestamp,
      event,
      decision,
      durationMs: Date.now() - started,
      executed: allowed
    }, this.options.policy.audit.redactSecrets);

    if (allowed) return { allowed: true };

    const message = decision.effect === "ask" ? "AgentGate approval required for MCP tool call" : "AgentGate denied MCP tool call";

    return {
      allowed: false,
      error: {
        jsonrpc: "2.0",
        id: request.id ?? null,
        error: {
          code: -32000,
          message,
          data: {
            ruleId: decision.ruleId,
            reason: decision.reason,
            risk: decision.risk,
            effect: decision.effect,
            executed: false,
            serverName,
            toolName: event.toolName,
            ...(decision.effect === "ask" ? { nonInteractive: true } : {})
          }
        }
      }
    };
  }

  private handleLine(serverName: string, line: string): void {
    if (!this.child) throw new Error("MCP proxy child process is not started");

    let request: JsonRpcRequest;
    try {
      request = JSON.parse(line) as JsonRpcRequest;
    } catch {
      this.child.stdin.write(`${line}\n`);
      return;
    }

    const result = this.evaluateRequest(serverName, request);
    if (result.allowed) {
      this.child.stdin.write(`${line}\n`);
      return;
    }

    writeJsonLine(process.stdout, result.error);
  }

  private handleChildError(serverName: string, error: Error): void {
    const message = `AgentGate MCP upstream "${serverName}" failed to start`;
    this.child = null;

    if (this.options.onChildError) {
      this.options.onChildError(message, error);
      return;
    }

    process.stderr.write(`${message}: ${error.message}\n`);
  }
}
