import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";
import { describe, expect, it } from "vitest";
import { McpProxy } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";
import { strictPolicy } from "../../src/presets/strict.js";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-mcp-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("McpProxy", () => {
  it("denies a filesystem read for protected paths", () => {
    const root = tempRoot();
    const policy = balancedPolicy();
    policy.mcp = {
      upstreams: {
        filesystem: {
          command: "node",
          args: ["server.js"]
        }
      }
    };

    const proxy = new McpProxy({
      policy,
      policyPath: path.join(root, "agentgate.yml"),
      cwd: root
    });

    const result = proxy.evaluateRequest("filesystem", {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "read_file",
        arguments: {
          path: ".ssh/id_rsa"
        }
      }
    });

    expect(result.allowed).toBe(false);
    expect(JSON.stringify(result.error)).toContain("AgentGate denied");
  });

  it("returns an approval-required error for MCP ask decisions", () => {
    const root = tempRoot();
    const policy = strictPolicy();
    policy.mcp = {
      upstreams: {
        shell: {
          command: "node",
          args: ["server.js"]
        }
      }
    };

    const proxy = new McpProxy({
      policy,
      policyPath: path.join(root, "agentgate.yml"),
      cwd: root
    });

    const result = proxy.evaluateRequest("shell", {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "shell.exec",
        arguments: {
          command: ["pnpm", "install"]
        }
      }
    });

    expect(result.allowed).toBe(false);
    expect(JSON.stringify(result.error)).toContain("AgentGate approval required");
  });
});
