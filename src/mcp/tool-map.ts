import type { ToolEvent } from "../core/event.js";
import { stableId } from "../util/stable-id.js";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export const toolCallToEvent = (serverName: string, request: JsonRpcRequest, cwd: string): ToolEvent | null => {
  if (request.method !== "tools/call") return null;
  const params = request.params && typeof request.params === "object" ? request.params as Record<string, unknown> : {};
  const toolName = typeof params.name === "string" ? params.name : "unknown";
  const input = params.arguments;

  return {
    id: stableId("evt", { serverName, request }),
    timestamp: new Date().toISOString(),
    kind: "mcp.tool",
    toolName,
    serverName,
    cwd,
    metadata: {
      jsonRpcId: String(request.id ?? "")
    },
    ...(input !== undefined ? { input } : {})
  };
};
