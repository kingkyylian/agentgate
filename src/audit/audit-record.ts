import type { PolicyDecision } from "../core/decision.js";
import type { ToolEvent } from "../core/event.js";

export interface AuditRecord {
  id: string;
  timestamp: string;
  event: ToolEvent;
  decision: PolicyDecision;
  durationMs: number;
  executed: boolean;
}
