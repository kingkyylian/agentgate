import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import { renderPolicyYaml } from "../../src/index.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-cli-exec-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("agentgate exec", () => {
  it("runs a low-risk command and logs it", async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(balancedPolicy()), "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "exec", "--", "node", "-e", "console.log('ok')"], {
      cwd: root
    });

    expect(result.stdout).toContain("ok");
    expect(fs.existsSync(path.join(root, ".agentgate/audit.jsonl"))).toBe(true);
  });

  it("denies a critical command before execution", async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, "agentgate.yml"), renderPolicyYaml(balancedPolicy()), "utf8");

    const result = await execa("node", [path.resolve("dist/cli/index.js"), "exec", "--", "rm", "-rf", "/"], {
      cwd: root,
      reject: false
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("DENY");
  });
});
