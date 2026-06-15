import { z } from "zod";
import type { AgentGatePolicy } from "../core/policy.js";
import type { DecisionEffect, RiskLevel } from "../core/decision.js";
import type { EvaluationContext } from "../core/context.js";
import { PolicyEngine } from "../core/engine.js";
import type { ToolEvent, ToolKind } from "../core/event.js";
import { stableId } from "../util/stable-id.js";

const decisionEffectSchema = z.enum(["allow", "deny", "ask", "redact"]);
const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
const toolKindSchema = z.enum(["shell.exec", "fs.read", "fs.write", "http.fetch", "mcp.tool"]);
const metadataValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const fixtureEventSchema = z.object({
  id: z.string().min(1).optional(),
  timestamp: z.string().min(1).optional(),
  kind: toolKindSchema,
  agent: z.string().min(1).optional(),
  toolName: z.string().min(1),
  serverName: z.string().min(1).optional(),
  cwd: z.string().min(1).optional(),
  command: z.array(z.string()).optional(),
  path: z.string().optional(),
  url: z.string().optional(),
  input: z.unknown().optional(),
  outputPreview: z.string().optional(),
  metadata: z.record(z.string(), metadataValueSchema).optional()
});

const fixtureExpectationSchema = z.object({
  effect: decisionEffectSchema,
  ruleId: z.string().min(1).optional(),
  risk: riskLevelSchema.optional()
});

const fixtureCaseSchema = z.object({
  name: z.string().min(1),
  event: fixtureEventSchema,
  expect: fixtureExpectationSchema
});

export const policyFixtureFileSchema = z.object({
  version: z.literal(1),
  cases: z.array(fixtureCaseSchema).min(1)
});

export type PolicyFixtureFile = z.infer<typeof policyFixtureFileSchema>;
export type PolicyFixtureExpectation = z.infer<typeof fixtureExpectationSchema>;

export interface PolicyFixtureRunOptions {
  workspaceRoot: string;
  cwd: string;
  now: Date;
}

export interface PolicyFixtureCaseResult {
  name: string;
  ok: boolean;
  expected: PolicyFixtureExpectation;
  actual: {
    effect: DecisionEffect;
    ruleId: string;
    risk: RiskLevel;
    reason: string;
  };
  failures: string[];
}

export interface PolicyFixtureRunResult {
  ok: boolean;
  passed: number;
  failed: number;
  cases: PolicyFixtureCaseResult[];
}

const toToolEvent = (
  name: string,
  index: number,
  fixtureEvent: PolicyFixtureFile["cases"][number]["event"],
  options: PolicyFixtureRunOptions
): ToolEvent => {
  const event: ToolEvent = {
    id: fixtureEvent.id ?? stableId("fixture", { name, index, event: fixtureEvent }),
    timestamp: fixtureEvent.timestamp ?? options.now.toISOString(),
    kind: fixtureEvent.kind as ToolKind,
    toolName: fixtureEvent.toolName,
    cwd: fixtureEvent.cwd ?? options.cwd,
    metadata: fixtureEvent.metadata ?? {}
  };

  if (fixtureEvent.agent !== undefined) event.agent = fixtureEvent.agent;
  if (fixtureEvent.serverName !== undefined) event.serverName = fixtureEvent.serverName;
  if (fixtureEvent.command !== undefined) event.command = fixtureEvent.command;
  if (fixtureEvent.path !== undefined) event.path = fixtureEvent.path;
  if (fixtureEvent.url !== undefined) event.url = fixtureEvent.url;
  if (fixtureEvent.input !== undefined) event.input = fixtureEvent.input;
  if (fixtureEvent.outputPreview !== undefined) event.outputPreview = fixtureEvent.outputPreview;

  return event;
};

export const runPolicyFixtureCases = (
  fixture: PolicyFixtureFile,
  policy: AgentGatePolicy,
  options: PolicyFixtureRunOptions
): PolicyFixtureRunResult => {
  const engine = new PolicyEngine(policy);
  const context: EvaluationContext = {
    workspaceRoot: options.workspaceRoot,
    now: options.now
  };
  const cases = fixture.cases.map((item, index): PolicyFixtureCaseResult => {
    const event = toToolEvent(item.name, index, item.event, options);
    const decision = engine.evaluate(event, context);
    const failures: string[] = [];

    if (decision.effect !== item.expect.effect) {
      failures.push(`expected effect ${item.expect.effect}, got ${decision.effect}`);
    }
    if (item.expect.ruleId !== undefined && decision.ruleId !== item.expect.ruleId) {
      failures.push(`expected ruleId ${item.expect.ruleId}, got ${decision.ruleId}`);
    }
    if (item.expect.risk !== undefined && decision.risk !== item.expect.risk) {
      failures.push(`expected risk ${item.expect.risk}, got ${decision.risk}`);
    }

    return {
      name: item.name,
      ok: failures.length === 0,
      expected: item.expect,
      actual: {
        effect: decision.effect,
        ruleId: decision.ruleId,
        risk: decision.risk,
        reason: decision.reason
      },
      failures
    };
  });
  const failed = cases.filter((item) => !item.ok).length;

  return {
    ok: failed === 0,
    passed: cases.length - failed,
    failed,
    cases
  };
};
