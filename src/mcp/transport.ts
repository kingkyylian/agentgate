import { EventEmitter } from "node:events";
import readline from "node:readline";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

export const wireLineReader = (stream: NodeJS.ReadableStream): EventEmitter => {
  const emitter = new EventEmitter();
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => emitter.emit("line", line));
  rl.on("close", () => emitter.emit("close"));
  return emitter;
};

export const writeJsonLine = (stream: NodeJS.WritableStream, value: unknown): void => {
  stream.write(`${JSON.stringify(value)}\n`);
};

export const forwardChildOutput = (child: ChildProcessWithoutNullStreams, output: NodeJS.WritableStream): void => {
  child.stdout.on("data", (chunk) => output.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
};
