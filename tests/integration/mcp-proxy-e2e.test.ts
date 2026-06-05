import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import { renderPolicyYaml } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

const roots: string[] = [];
const children: ChildProcessWithoutNullStreams[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-mcp-e2e-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const child of children.splice(0)) child.kill();
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("agentgate mcp-proxy", () => {
  it("reports missing config without a stack trace", async () => {
    const root = tempRoot();

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "mcp-proxy"], {
      cwd: root,
      reject: false
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("FAIL mcp-proxy: No agentgate.yml found. Run agentgate init first.");
    expect(result.stderr).not.toContain("at Command");
  });

  it("reports unknown upstream names with available server names", async () => {
    const root = tempRoot();
    const policy = balancedPolicy();
    policy.mcp = {
      upstreams: {
        filesystem: {
          command: "node",
          args: [path.resolve("tests/fixtures/mcp-upstream.mjs")]
        }
      }
    };
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(policy), "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "mcp-proxy", "--server", "shell"], {
      cwd: root,
      reject: false
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('FAIL mcp-proxy: No MCP upstream named "shell" configured in agentgate.yml.');
    expect(result.stderr).toContain("Available upstreams: filesystem");
    expect(result.stderr).not.toContain("at Command");
  });

  it("reports invalid MCP config paths without a stack trace", async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, "agentgate.yml"), [
      "version: 1",
      "mode: enforce",
      "workspace:",
      "  root: .",
      "  readable: ['**']",
      "  writable: ['src/**']",
      "  neverRead: []",
      "audit:",
      "  path: .agentgate/audit.jsonl",
      "  redactSecrets: true",
      "approval:",
      "  mode: none",
      "rules: []",
      "mcp:",
      "  upstreams:",
      "    filesystem:",
      "      command: node"
    ].join("\n"), "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "mcp-proxy", "--server", "filesystem"], {
      cwd: root,
      reject: false
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("FAIL mcp-proxy: Invalid AgentGate policy");
    expect(result.stderr).toContain("mcp.upstreams.filesystem.args");
    expect(result.stderr).not.toContain("at Command");
  });

  it("forwards allowed calls to upstream and blocks denied calls before upstream", async () => {
    const root = tempRoot();
    const policy = balancedPolicy();
    policy.mcp = {
      upstreams: {
        filesystem: {
          command: "node",
          args: [path.resolve("tests/fixtures/mcp-upstream.mjs")]
        }
      }
    };
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(policy), "utf8");

    const child = spawn("node", [path.resolve("dist/cli/index.js"), "mcp-proxy", "--server", "filesystem"], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"]
    });
    children.push(child);

    const stdoutLines: string[] = [];
    child.stdout.on("data", (chunk) => {
      stdoutLines.push(...String(chunk).split("\n").filter(Boolean));
    });

    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "read_file",
        arguments: {
          path: "README.md"
        }
      }
    })}\n`);

    const allowed = await waitForLine(stdoutLines, (line) => line.includes("upstream handled read_file"));
    expect(allowed).toContain("upstream handled read_file");

    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "read_file",
        arguments: {
          path: ".ssh/id_rsa"
        }
      }
    })}\n`);

    const denied = await waitForLine(stdoutLines, (line) => line.includes("AgentGate denied MCP tool call"));
    expect(denied).toContain("deny-private-key-reads");
    expect(stdoutLines.filter((line) => line.includes("upstream handled read_file"))).toHaveLength(1);
    expect(fs.existsSync(path.join(root, ".agentgate/audit.jsonl"))).toBe(true);
  });

  it("exits with a clear error when the upstream process cannot start", async () => {
    const root = tempRoot();
    const policy = balancedPolicy();
    policy.mcp = {
      upstreams: {
        broken: {
          command: "agentgate-missing-mcp-upstream-command",
          args: []
        }
      }
    };
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(policy), "utf8");

    const child = spawn("node", [path.resolve("dist/cli/index.js"), "mcp-proxy", "--server", "broken"], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"]
    });
    children.push(child);

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const exit = await waitForExit(child);
    expect(exit.code).toBe(1);
    expect(stderr).toContain('AgentGate MCP upstream "broken" failed to start');
    expect(stderr).toContain("ENOENT");
  });
});

async function waitForLine(lines: string[], predicate: (line: string) => boolean): Promise<string> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const found = lines.find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for line. Saw:\n${lines.join("\n")}`);
}

async function waitForExit(child: ChildProcessWithoutNullStreams): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
}
