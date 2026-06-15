import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { policyFixtureFileSchema, runPolicyFixtureCases, type PolicyFixtureFile } from "../../src/policy/fixtures.js";
import { balancedPolicy } from "../../src/presets/balanced.js";

describe("policy fixture runner", () => {
  it("evaluates fixture cases and reports passing expectations", () => {
    const fixture: PolicyFixtureFile = {
      version: 1,
      cases: [
        {
          name: "blocks credential reads",
          event: {
            kind: "fs.read",
            toolName: "fs.read",
            path: ".ssh/id_rsa"
          },
          expect: {
            effect: "deny",
            ruleId: "deny-private-key-reads"
          }
        },
        {
          name: "allows source writes",
          event: {
            kind: "fs.write",
            toolName: "fs.write",
            path: "src/index.ts"
          },
          expect: {
            effect: "allow"
          }
        }
      ]
    };

    const result = runPolicyFixtureCases(fixture, balancedPolicy(), {
      workspaceRoot: "/repo",
      cwd: "/repo",
      now: new Date("2026-06-02T12:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.cases).toEqual([
      expect.objectContaining({
        name: "blocks credential reads",
        ok: true,
        expected: expect.objectContaining({ effect: "deny", ruleId: "deny-private-key-reads" }),
        actual: expect.objectContaining({ effect: "deny", ruleId: "deny-private-key-reads" })
      }),
      expect.objectContaining({
        name: "allows source writes",
        ok: true,
        expected: expect.objectContaining({ effect: "allow" }),
        actual: expect.objectContaining({ effect: "allow" })
      })
    ]);
  });

  it("reports effect and rule mismatches without hiding the actual decision", () => {
    const fixture: PolicyFixtureFile = {
      version: 1,
      cases: [
        {
          name: "expects the wrong rule",
          event: {
            kind: "fs.read",
            toolName: "fs.read",
            path: ".ssh/id_rsa"
          },
          expect: {
            effect: "allow",
            ruleId: "default-allow"
          }
        }
      ]
    };

    const result = runPolicyFixtureCases(fixture, balancedPolicy(), {
      workspaceRoot: "/repo",
      cwd: "/repo",
      now: new Date("2026-06-02T12:00:00.000Z")
    });

    expect(result.ok).toBe(false);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.cases[0]).toEqual(expect.objectContaining({
      name: "expects the wrong rule",
      ok: false,
      failures: [
        "expected effect allow, got deny",
        "expected ruleId default-allow, got deny-private-key-reads"
      ],
      actual: expect.objectContaining({
        effect: "deny",
        ruleId: "deny-private-key-reads"
      })
    }));
  });

  it("keeps the packaged basic fixture executable against the balanced policy", () => {
    const fixture = policyFixtureFileSchema.parse(
      parse(fs.readFileSync(path.resolve("examples/policy-tests/basic.agentgate-tests.yml"), "utf8"))
    );
    const result = runPolicyFixtureCases(fixture, balancedPolicy(), {
      workspaceRoot: "/repo",
      cwd: "/repo",
      now: new Date("2026-06-02T12:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.passed).toBe(3);
  });
});
