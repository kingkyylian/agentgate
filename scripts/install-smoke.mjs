import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";

const root = path.resolve(import.meta.dirname, "..");
const packDir = await mkdtemp(path.join(tmpdir(), "agentgate-pack-"));
const installDir = await mkdtemp(path.join(tmpdir(), "agentgate-install-"));
const userConfig = path.join(installDir, "user.npmrc");
const globalConfig = path.join(installDir, "global.npmrc");
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_") && key !== "INIT_CWD")
);
Object.assign(env, {
  npm_config_loglevel: "error",
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_registry: "https://registry.npmjs.org/",
  npm_config_userconfig: userConfig,
  npm_config_globalconfig: globalConfig
});
const commandOptions = {
  env,
  timeout: 120_000
};

try {
  await Promise.all([writeFile(userConfig, ""), writeFile(globalConfig, "")]);
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
