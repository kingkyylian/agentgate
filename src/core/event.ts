export type ToolKind =
  | "shell.exec"
  | "fs.read"
  | "fs.write"
  | "http.fetch"
  | "mcp.tool";

export interface ToolEvent {
  id: string;
  timestamp: string;
  kind: ToolKind;
  agent?: string;
  toolName: string;
  serverName?: string;
  cwd: string;
  command?: string[];
  path?: string;
  url?: string;
  input?: unknown;
  outputPreview?: string;
  metadata: Record<string, string | number | boolean>;
}
