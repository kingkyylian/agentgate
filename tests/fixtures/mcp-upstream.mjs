import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }

  if (request.method === "tools/list") {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: request.id ?? null,
      result: {
        tools: [
          {
            name: "read_file",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string" }
              }
            }
          }
        ]
      }
    })}\n`);
    return;
  }

  if (request.method === "tools/call") {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: request.id ?? null,
      result: {
        content: [
          {
            type: "text",
            text: `upstream handled ${request.params?.name ?? "unknown"}`
          }
        ]
      }
    })}\n`);
  }
});
