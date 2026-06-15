import { execa } from "execa";

const required = new Set([
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "dist/index.js",
  "dist/cli/index.js",
  "docs/policy.md",
  "docs/threat-model.md",
  "examples/policies/balanced.agentgate.yml"
]);

const forbiddenPrefixes = [
  "docs/checkpoints/",
  ".agentgate/",
  "node_modules/"
];

const forbiddenSuffixes = [
  ".tgz"
];

await execa("pnpm", ["build"], { stdio: "inherit" });
const pack = await execa("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]);
const payload = JSON.parse(pack.stdout);
const files = new Set(payload.flatMap((entry) => entry.files.map((file) => file.path)));

const missing = [...required].filter((file) => !files.has(file));
const forbidden = [...files].filter(
  (file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)) ||
    forbiddenSuffixes.some((suffix) => file.endsWith(suffix))
);

if (missing.length > 0 || forbidden.length > 0) {
  const details = [
    missing.length > 0 ? `Missing required files:\n${missing.map((file) => `- ${file}`).join("\n")}` : "",
    forbidden.length > 0 ? `Forbidden package files:\n${forbidden.map((file) => `- ${file}`).join("\n")}` : ""
  ].filter(Boolean).join("\n\n");
  throw new Error(details);
}

const [{ name, version, filename, size, unpackedSize }] = payload;
console.log(`package-smoke ok: ${name}@${version} ${filename} ${size}B/${unpackedSize}B`);
