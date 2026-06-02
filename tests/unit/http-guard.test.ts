import { describe, expect, it } from "vitest";
import { evaluateHttpEvent } from "../../src/guards/http.js";
import { balancedPolicy } from "../../src/presets/balanced.js";
import type { ToolEvent } from "../../src/index.js";

const httpEvent = (url: string): ToolEvent => ({
  id: "evt",
  timestamp: "2026-06-02T12:00:00.000Z",
  kind: "http.fetch",
  toolName: "http.fetch",
  cwd: "/repo",
  url,
  metadata: {}
});

describe("evaluateHttpEvent", () => {
  it("allows public HTTPS origins", () => {
    const decision = evaluateHttpEvent(balancedPolicy(), httpEvent("https://example.com"));
    expect(decision.effect).toBe("allow");
  });

  it("denies cloud metadata URLs", () => {
    const decision = evaluateHttpEvent(balancedPolicy(), httpEvent("http://169.254.169.254/latest/meta-data"));
    expect(decision.effect).toBe("deny");
    expect(decision.ruleId).toBe("http-link-local-denied");
  });

  it("denies loopback URLs", () => {
    const decision = evaluateHttpEvent(balancedPolicy(), httpEvent("http://localhost:3000"));
    expect(decision.effect).toBe("deny");
  });

  it("denies private network URLs", () => {
    const decision = evaluateHttpEvent(balancedPolicy(), httpEvent("http://192.168.1.10"));
    expect(decision.effect).toBe("deny");
  });

  it("denies invalid URLs", () => {
    const decision = evaluateHttpEvent(balancedPolicy(), httpEvent("not a url"));
    expect(decision.effect).toBe("deny");
  });
});
