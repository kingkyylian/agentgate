import type { PolicyDecision } from "../core/decision.js";
import { allowDecision, denyDecision } from "../core/decision.js";
import type { EvaluationContext } from "../core/context.js";
import type { ToolEvent } from "../core/event.js";
import type { AgentGatePolicy } from "../core/policy.js";
import { matchesAny, normalizeWorkspacePath } from "../util/paths.js";

export const defaultNeverReadPatterns = [
  ".env",
  ".env.*",
  ".ssh/**",
  ".gnupg/**",
  "**/*.pem",
  "**/*.key",
  "**/*_rsa",
  "**/id_ed25519",
  "**/secrets/**",
  "**/.npmrc",
  "**/.pypirc"
];

export const evaluateFilesystemEvent = (
  policy: AgentGatePolicy,
  event: ToolEvent,
  context: EvaluationContext
): PolicyDecision => {
  if (event.kind !== "fs.read" && event.kind !== "fs.write") return allowDecision("Not a filesystem event");
  if (!event.path) return denyDecision("fs-missing-path", "Filesystem event is missing a path", "high");

  const normalized = normalizeWorkspacePath(context.workspaceRoot, event.cwd, event.path);
  const protectedPatterns = [...defaultNeverReadPatterns, ...policy.workspace.neverRead];

  if (event.kind === "fs.read" && !normalized.insideWorkspace) {
    return denyDecision("fs-read-outside-workspace", `Reads outside workspace are blocked: ${event.path}`, "high");
  }

  if (event.kind === "fs.write" && !normalized.insideWorkspace) {
    return denyDecision("fs-write-outside-workspace", `Writes outside workspace are blocked: ${event.path}`);
  }

  if (event.kind === "fs.read" && matchesAny(normalized.relativePath, protectedPatterns)) {
    return denyDecision("fs-never-read", `Reads matching protected path policy are blocked: ${normalized.relativePath}`);
  }

  if (event.kind === "fs.write" && !matchesAny(normalized.relativePath, policy.workspace.writable)) {
    return denyDecision("fs-write-not-allowed", `Write is outside allowed paths: ${normalized.relativePath}`, "high");
  }

  if (event.kind === "fs.read" && !matchesAny(normalized.relativePath, policy.workspace.readable)) {
    return denyDecision("fs-read-not-allowed", `Read is outside allowed paths: ${normalized.relativePath}`, "high");
  }

  return allowDecision(`Filesystem ${event.kind === "fs.read" ? "read" : "write"} is allowed`);
};
