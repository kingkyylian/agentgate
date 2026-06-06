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
    expect(output.warnings).toEqual([]);
    expect(output.failures).toEqual([]);
    expect(output.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "policy", status: "pass", message: "valid" }),
      expect.objectContaining({ name: "audit redaction", status: "pass", message: "enabled" }),
      expect.objectContaining({ name: "private network guard", status: "pass", message: "configured" }),
      expect.objectContaining({ name: "terminal approval", status: "pass", message: "enabled" })
    ]));
    expect(output.next).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "review audit events", command: "agentgate logs --review" })
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
