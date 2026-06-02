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
  it("creates and validates a policy", async () => {
    const root = tempRoot();
    await execa("node", [path.resolve("dist/cli/index.js"), "init"], { cwd: root });
    const result = await execa("node", [path.resolve("dist/cli/index.js"), "check"], { cwd: root });

    expect(fs.existsSync(path.join(root, "agentgate.yml"))).toBe(true);
    expect(result.stdout).toContain("PASS policy");
  });
});
