import { createHash } from "node:crypto";

export const stableId = (prefix: string, input: unknown): string => {
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
};
