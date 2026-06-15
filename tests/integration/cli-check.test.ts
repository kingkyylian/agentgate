import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-cli-check-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("agentgate init/check", () => {
  it("prints actionable setup guidance when no policy exists", async () => {
    const root = tempRoot();
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check"], { cwd: root, reject: false });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("FAIL policy: No agentgate.yml found");
    expect(result.stderr).toContain("NEXT run: agentgate init --preset balanced");
    expect(result.stderr).toContain("NEXT check again: agentgate check");
  });

  it("creates and validates a policy", async () => {
    const root = tempRoot();
    await execa("node", [path.resolve("dist/cli/index.js"), "init"], { cwd: root });
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check"], { cwd: root });
    const strictResult = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--strict"], { cwd: root });

    expect(fs.existsSync(path.join(root, "agentgate.yml"))).toBe(true);
    expect(result.stdout).toContain("PASS policy: valid");
    expect(result.stdout).toContain("PASS audit redaction: enabled");
    expect(result.stdout).toContain("PASS credential read guard: configured");
    expect(result.stdout).toContain("PASS private network guard: configured");
    expect(result.stdout).toContain("PASS terminal approval: enabled");
    expect(result.stdout).toContain("NEXT review audit events: agentgate logs --review");
    expect(strictResult.exitCode).toBe(0);
  });

  it("prints machine-readable JSON for a valid policy", async () => {
    const root = tempRoot();
    await execa("node", [path.resolve("dist/cli/index.js"), "init"], { cwd: root });
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--format", "json"], { cwd: root });
    const realRoot = fs.realpathSync(root);
    const output = JSON.parse(result.stdout) as {
      schemaVersion: number;
      ok: boolean;
      status: string;
      strict: boolean;
      policyPath: string | null;
      workspaceRoot: string | null;
      readiness: {
        mcp: { configured: boolean; upstreams: string[]; setupCommand: string | null };
        hygiene: { checkpointIgnore: string; packageSmoke: string };
      };
      checks: Array<{ name: string; status: string; message: string }>;
      warnings: unknown[];
      failures: unknown[];
      next: Array<{ name: string; command?: string }>;
    };

    expect(result.stderr).toBe("");
    expect(output.schemaVersion).toBe(1);
    expect(output.ok).toBe(true);
    expect(output.status).toBe("pass");
    expect(output.strict).toBe(false);
    expect(output.policyPath).toBe(path.join(realRoot, "agentgate.yml"));
    expect(output.workspaceRoot).toBe(realRoot);
    expect(output.readiness.mcp).toEqual({
      configured: false,
      upstreams: [],
      setupCommand: null
    });
    expect(output.readiness.hygiene).toEqual({
      checkpointIgnore: "skip",
      packageSmoke: "skip"
    });
    expect(output.warnings).toEqual([]);
    expect(output.failures).toEqual([]);
    expect(output.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "policy", status: "pass", message: "valid" }),
      expect.objectContaining({ name: "audit redaction", status: "pass", message: "enabled" }),
      expect.objectContaining({ name: "private network guard", status: "pass", message: "configured" }),
      expect.objectContaining({ name: "terminal approval", status: "pass", message: "enabled" }),
      expect.objectContaining({ name: "mcp proxy", status: "pass", message: "not configured" })
    ]));
    expect(output.next).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "review audit events", command: "agentgate logs --review" })
    ]));
  });

  it("prints MCP and package-hygiene metadata for automation", async () => {
    const root = tempRoot();
    await execa("node", [path.resolve("dist/cli/index.js"), "init"], { cwd: root });
    const policyPath = path.join(root, "agentgate.yml");
    fs.appendFileSync(policyPath, [
      "",
      "mcp:",
      "  upstreams:",
      "    filesystem:",
      "      command: node",
      "      args: [server.mjs]"
    ].join("\n"), "utf8");
    fs.mkdirSync(path.join(root, "docs/checkpoints"), { recursive: true });
    fs.writeFileSync(path.join(root, ".gitignore"), ["docs/checkpoints/", "*.tgz", ""].join("\n"), "utf8");
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
      scripts: {
        "smoke:package": "node scripts/package-smoke.mjs"
      }
    }), "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--format", "json"], { cwd: root });
    const output = JSON.parse(result.stdout) as {
      ok: boolean;
      status: string;
      readiness: {
        mcp: { configured: boolean; upstreams: string[]; setupCommand: string | null };
        hygiene: { checkpointIgnore: string; packageSmoke: string };
      };
      checks: Array<{ name: string; status: string; message: string }>;
      warnings: unknown[];
    };

    expect(output.ok).toBe(true);
    expect(output.status).toBe("pass");
    expect(output.readiness.mcp).toEqual({
      configured: true,
      upstreams: ["filesystem"],
      setupCommand: "agentgate mcp setup --server filesystem --launch global"
    });
    expect(output.readiness.hygiene).toEqual({
      checkpointIgnore: "pass",
      packageSmoke: "pass"
    });
    expect(output.warnings).toEqual([]);
    expect(output.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "mcp proxy", status: "pass", message: "configured: filesystem" }),
      expect.objectContaining({ name: "checkpoint ignore", status: "pass", message: "configured" }),
      expect.objectContaining({ name: "package smoke", status: "pass", message: "configured" })
    ]));
  });

  it("warns about unsafe audit paths and package hygiene gaps", async () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, "docs/checkpoints"), { recursive: true });
    fs.writeFileSync(path.join(root, ".gitignore"), "node_modules/\n", "utf8");
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
      scripts: {
        "smoke:package": "npm pack --dry-run"
      }
    }), "utf8");
    fs.writeFileSync(
      path.join(root, "agentgate.yml"),
      [
        "version: 1",
        "mode: enforce",
        "workspace:",
        '  root: "."',
        '  readable: ["**"]',
        '  writable: ["src/**"]',
        '  neverRead: [".env", ".ssh/**"]',
        "audit:",
        '  path: "../agentgate-audit.jsonl"',
        "  redactSecrets: true",
        "approval:",
        '  mode: "terminal"',
        "rules:",
        "  - id: deny-private-key-reads",
        "    effect: deny",
        '    tools: ["fs.read", "mcp.tool", "read_file"]',
        '    paths: [".ssh/**", ".env"]',
        "  - id: deny-metadata-fetch",
        "    effect: deny",
        '    tools: ["http.fetch", "mcp.tool", "fetch"]',
        "    urls:",
        "      denyPrivateNetworks: true",
        "      denyLinkLocal: true",
        "      denyLoopback: true"
      ].join("\n"),
      "utf8"
    );

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--format", "json"], { cwd: root });
    const output = JSON.parse(result.stdout) as {
      ok: boolean;
      status: string;
      readiness: {
        mcp: { configured: boolean; upstreams: string[]; setupCommand: string | null };
        hygiene: { checkpointIgnore: string; packageSmoke: string };
      };
      warnings: Array<{ name: string; message: string; remediation?: string }>;
      checks: Array<{ name: string; status: string; message: string }>;
    };

    expect(output.ok).toBe(true);
    expect(output.status).toBe("warn");
    expect(output.readiness.mcp).toEqual({
      configured: false,
      upstreams: [],
      setupCommand: null
    });
    expect(output.readiness.hygiene).toEqual({
      checkpointIgnore: "warn",
      packageSmoke: "warn"
    });
    expect(output.warnings).toEqual(expect.arrayContaining([
      {
        name: "audit path",
        message: "outside workspace",
        remediation: "store audit logs under the workspace, for example .agentgate/audit.jsonl"
      },
      {
        name: "checkpoint ignore",
        message: "docs/checkpoints/ is not ignored",
        remediation: "add docs/checkpoints/ to .gitignore"
      },
      {
        name: "package smoke",
        message: "missing hardened package smoke",
        remediation: "set scripts.smoke:package to node scripts/package-smoke.mjs"
      }
    ]));
    expect(output.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "mcp proxy", status: "pass", message: "not configured" })
    ]));
  });

  it("prints machine-readable JSON for missing policy failures", async () => {
    const root = tempRoot();
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--format", "json"], { cwd: root, reject: false });
    const output = JSON.parse(result.stdout) as {
      ok: boolean;
      status: string;
      policyPath: string | null;
      workspaceRoot: string | null;
      failures: Array<{ name: string; message: string; remediation?: string }>;
      next: Array<{ name: string; command?: string }>;
    };

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    expect(output.ok).toBe(false);
    expect(output.status).toBe("fail");
    expect(output.policyPath).toBeNull();
    expect(output.workspaceRoot).toBeNull();
    expect(output.failures).toEqual([
      {
        name: "policy",
        message: "No agentgate.yml found",
        remediation: "agentgate init --preset balanced"
      }
    ]);
    expect(output.next).toEqual([
      { name: "run", command: "agentgate init --preset balanced" },
      { name: "check again", command: "agentgate check" }
    ]);
  });

  it("prints machine-readable warning metadata and strict readiness failures", async () => {
    const root = tempRoot();
    await execa("node", [path.resolve("dist/cli/index.js"), "init", "--preset", "monitor"], { cwd: root });
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--strict", "--format", "json"], { cwd: root, reject: false });
    const output = JSON.parse(result.stdout) as {
      ok: boolean;
      status: string;
      strict: boolean;
      warnings: Array<{ name: string; message: string; remediation?: string }>;
      failures: Array<{ name: string; message: string; remediation?: string }>;
    };

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    expect(output.ok).toBe(false);
    expect(output.status).toBe("fail");
    expect(output.strict).toBe(true);
    expect(output.warnings).toEqual(expect.arrayContaining([
      {
        name: "mode",
        message: "monitor records decisions without blocking them",
        remediation: "set mode: enforce when ready"
      },
      {
        name: "terminal approval",
        message: "disabled",
        remediation: "set approval.mode: terminal"
      }
    ]));
    expect(output.failures).toEqual([
      {
        name: "readiness",
        message: "2 warning(s) found",
        remediation: "resolve warnings or rerun without --strict"
      }
    ]);
  });

  it("warns when monitor mode only observes decisions", async () => {
    const root = tempRoot();
    await execa("node", [path.resolve("dist/cli/index.js"), "init", "--preset", "monitor"], { cwd: root });
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check"], { cwd: root });
    const strictResult = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--strict"], { cwd: root, reject: false });

    expect(result.stdout).toContain("WARN mode: monitor records decisions without blocking them");
    expect(result.stdout).toContain("NEXT enable enforcement: set mode: enforce when ready");
    expect(result.stdout).toContain("WARN terminal approval: disabled");
    expect(result.stdout).toContain("NEXT enable terminal approval: set approval.mode: terminal");
    expect(strictResult.exitCode).toBe(1);
    expect(strictResult.stderr).toContain("FAIL readiness: 2 warning(s) found");
  });

  it("prints hardening guidance for weak custom policies", async () => {
    const root = tempRoot();
    fs.writeFileSync(
      path.join(root, "agentgate.yml"),
      [
        "version: 1",
        "mode: enforce",
        "workspace:",
        '  root: "."',
        '  readable: ["**"]',
        '  writable: ["**"]',
        "  neverRead: []",
        "audit:",
        '  path: ".agentgate/audit.jsonl"',
        "  redactSecrets: false",
        "approval:",
        '  mode: "none"',
        "rules: []"
      ].join("\n"),
      "utf8"
    );

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check"], { cwd: root });
    const strictResult = await execa("node", [path.resolve("dist/cli/index.js"), "check", "--strict"], { cwd: root, reject: false });

    expect(result.stdout).toContain("WARN audit redaction: disabled");
    expect(result.stdout).toContain("NEXT enable audit redaction: set audit.redactSecrets: true");
    expect(result.stdout).toContain("PASS credential read guard: configured");
    expect(result.stdout).toContain("WARN private network guard: missing");
    expect(result.stdout).toContain("NEXT add network guard: deny private, loopback, and link-local fetches");
    expect(result.stdout).toContain("WARN terminal approval: disabled");
    expect(result.stdout).toContain("NEXT enable terminal approval: set approval.mode: terminal");
    expect(strictResult.exitCode).toBe(1);
    expect(strictResult.stderr).toContain("FAIL readiness: 3 warning(s) found");
  });
});
