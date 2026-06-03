import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";

const root = path.resolve(import.meta.dirname, "..");
const packDir = await mkdtemp(path.join(tmpdir(), "agentgate-pack-"));
const installDir = await mkdtemp(path.join(tmpdir(), "agentgate-install-"));
const env = {
  ...process.env,
  npm_config_loglevel: "error",
  npm_config_audit: "false",
  npm_config_fund: "false"
};
const commandOptions = {
  env,
  timeout: 120_000
};

try {
  await execa("pnpm", ["build"], { cwd: root, ...commandOptions });
  const pack = await execa("npm", ["pack", "--ignore-scripts", "--pack-destination", packDir], {
    cwd: root,
    ...commandOptions
  });
  const tarball = pack.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".tgz"))
    .at(-1);

  if (!tarball) {
    throw new Error(`npm pack did not report a tarball:\n${pack.stdout}`);
  }

  const tarballPath = path.join(packDir, tarball);
  await execa("npm", ["init", "-y"], { cwd: installDir, ...commandOptions });
  await execa("npm", ["install", "--ignore-scripts", tarballPath], { cwd: installDir, ...commandOptions });
  const demo = await execa("npx", ["--no-install", "agentgate", "demo"], { cwd: installDir, ...commandOptions });

  if (!demo.stdout.includes("AgentGate demo") || !demo.stdout.includes("DENY") || !demo.stdout.includes("ALLOW")) {
    throw new Error(`Unexpected demo output:\n${demo.stdout}`);
  }

  console.log("install-smoke ok");
} finally {
  await rm(packDir, { recursive: true, force: true });
  await rm(installDir, { recursive: true, force: true });
}
