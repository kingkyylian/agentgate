import { describe, expect, it } from "vitest";
import { evaluateSecretEvent } from "../../src/guards/secret.js";
import { redactText } from "../../src/util/redaction.js";
import type { ToolEvent } from "../../src/index.js";

const event = (input: unknown): ToolEvent => ({
  id: "evt",
  timestamp: "2026-06-02T12:00:00.000Z",
  kind: "mcp.tool",
  toolName: "example",
  cwd: "/repo",
  input,
  metadata: {}
});

describe("secret guard", () => {
  it("redacts OpenAI-style keys", () => {
    const fakeOpenAiKey = `sk-${"a".repeat(24)}`;
    const result = redactText("input", ["token", fakeOpenAiKey].join("="));
    expect(result.text).toContain("[REDACTED]");
    expect(result.matches[0]?.pattern).toBe("openai-key");
  });

  it("redacts GitHub tokens", () => {
    const fakeGitHubToken = `github_pat_${"a".repeat(24)}`;
    const decision = evaluateSecretEvent(event(fakeGitHubToken));
    expect(decision.effect).toBe("redact");
    expect(decision.redactions[0]?.pattern).toBe("github-token");
  });

  it("does not redact normal prose", () => {
    const decision = evaluateSecretEvent(event("normal safe text"));
    expect(decision.effect).toBe("allow");
  });
});
