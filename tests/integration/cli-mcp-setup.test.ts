import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import { renderPolicyYaml } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-cli-mcp-setup-"));
  roots.push(root);
  return root;
};

const writePolicyWithUpstreams = (root: string, upstreams: Record<string, { command: string; args: string[] }>): void => {
  const policy = balancedPolicy();
  policy.mcp = { upstreams };
  fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(policy), "utf8");
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("agentgate mcp setup", () => {
  it("prints global CLI MCP client config for a configured upstream", async () => {
    const root = tempRoot();
    writePolicyWithUpstreams(root, {
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
      }
    });

    const result = await execa("node", [
      path.resolve("dist/cli/index.js"),
      "mcp",
      "setup",
      "--server",
      "filesystem",
      "--launch",
      "global"
    ], { cwd: root });
    const output = JSON.parse(result.stdout) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };

    expect(result.stderr).toBe("");
    expect(output.mcpServers["agentgate-filesystem"]).toEqual({
      command: "agentgate",
      args: ["mcp-proxy", "--config", "agentgate.yml", "--server", "filesystem"]
    });
  });

  it("auto-selects the only upstream and prints repo-local Node config", async () => {
    const root = tempRoot();
    writePolicyWithUpstreams(root, {
      filesystem: {
        command: "node",
        args: ["server.mjs"]
      }
    });

    const result = await execa("node", [
      path.resolve("dist/cli/index.js"),
      "mcp",
      "setup",
      "--launch",
      "local"
    ], { cwd: root });
    const output = JSON.parse(result.stdout) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };

    expect(output.mcpServers["agentgate-filesystem"]).toEqual({
      command: "node",
      args: ["dist/cli/index.js", "mcp-proxy", "--config", "agentgate.yml", "--server", "filesystem"]
    });
  });

  it("rejects unknown upstream names with available names", async () => {
    const root = tempRoot();
    writePolicyWithUpstreams(root, {
      filesystem: {
        command: "node",
        args: ["server.mjs"]
      }
    });

    const result = await execa("node", [
      path.resolve("dist/cli/index.js"),
      "mcp",
      "setup",
      "--server",
      "shell"
    ], { cwd: root, reject: false });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('FAIL mcp setup: No MCP upstream named "shell" configured in agentgate.yml.');
    expect(result.stderr).toContain("Available upstreams: filesystem");
    expect(result.stderr).not.toContain("at Command");
  });
});
