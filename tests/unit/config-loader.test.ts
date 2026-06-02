import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findPolicyPath, loadPolicyFromPath, renderPolicyYaml } from "../../src/index.js";
import { strictPolicy } from "../../src/presets/strict.js";

const roots: string[] = [];

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentgate-config-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("config loader", () => {
  it("returns null when no policy exists", () => {
    expect(findPolicyPath(tempRoot())).toBeNull();
  });

  it("loads a strict policy", () => {
    const root = tempRoot();
    const policyPath = path.join(root, "agentgate.yml");
    fs.writeFileSync(policyPath, renderPolicyYaml(strictPolicy()), "utf8");

    const loaded = loadPolicyFromPath(policyPath);
    expect(loaded.policy.version).toBe(1);
    expect(loaded.policy.rules.some((rule) => rule.id === "ask-medium-shell")).toBe(true);
  });

  it("fails invalid versions", () => {
    const root = tempRoot();
    const policyPath = path.join(root, "agentgate.yml");
    fs.writeFileSync(policyPath, "version: 2\nmode: enforce\n", "utf8");

    expect(() => loadPolicyFromPath(policyPath)).toThrow("Invalid AgentGate policy");
  });
});
