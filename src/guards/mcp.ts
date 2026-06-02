import type { ToolEvent } from "../core/event.js";

const stringArg = (input: unknown, key: string): string | undefined => {
  if (!input || typeof input !== "object") return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
};

const commandArg = (input: unknown): string[] | undefined => {
  if (!input || typeof input !== "object") return undefined;
  const value = (input as Record<string, unknown>).command;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  if (typeof value === "string") return value.trim().split(/\s+/).filter(Boolean);
  return undefined;
};

export const normalizeMcpToolEvent = (event: ToolEvent): ToolEvent => {
  if (event.kind !== "mcp.tool") return event;

  const name = event.toolName.toLowerCase();
  const path = event.path ?? stringArg(event.input, "path") ?? stringArg(event.input, "file") ?? stringArg(event.input, "target");
  const url = event.url ?? stringArg(event.input, "url") ?? stringArg(event.input, "uri");
  const command = event.command ?? commandArg(event.input);

  if ((name.includes("shell") || name.includes("exec") || name.includes("command")) && command) {
    return {
      ...event,
      kind: "shell.exec",
      toolName: event.toolName,
      command
    };
  }

  if (name.includes("read") && path) {
    return {
      ...event,
      kind: "fs.read",
      toolName: event.toolName,
      path
    };
  }

  if ((name.includes("write") || name.includes("edit")) && path) {
    return {
      ...event,
      kind: "fs.write",
      toolName: event.toolName,
      path
    };
  }

  if ((name.includes("fetch") || name.includes("http") || name.includes("url")) && url) {
    return {
      ...event,
      kind: "http.fetch",
      toolName: event.toolName,
      url
    };
  }

  return event;
};
