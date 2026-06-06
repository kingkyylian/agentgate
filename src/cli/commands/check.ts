import path from "node:path";
import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import type { AgentGatePolicy } from "../../core/policy.js";
import { defaultNeverReadPatterns } from "../../guards/filesystem.js";

interface CheckOptions {
  config?: string;
  strict?: boolean;
}

const hasCredentialReadGuard = (policy: AgentGatePolicy): boolean => {
  const protectedPatterns = [...defaultNeverReadPatterns, ...policy.workspace.neverRead];
  const workspaceGuard = protectedPatterns.some((pattern) =>
    [".env", ".ssh", ".gnupg", ".aws", ".npmrc", ".pypirc", ".pem", ".key", "id_ed25519"].some((needle) => pattern.includes(needle))
  );
  const ruleGuard = policy.rules.some((rule) =>
    rule.effect === "deny" &&
    rule.paths?.some((pattern) =>
      [".env", ".ssh", ".gnupg", ".aws", ".npmrc", ".pypirc", ".pem", ".key", "id_ed25519"].some((needle) => pattern.includes(needle))
    )
  );

  return workspaceGuard || ruleGuard;
};

const hasPrivateNetworkGuard = (policy: AgentGatePolicy): boolean =>
  policy.rules.some((rule) =>
    rule.urls?.denyPrivateNetworks === true || rule.urls?.denyLinkLocal === true || rule.urls?.denyLoopback === true
  );

const printLine = (status: "PASS" | "WARN" | "NEXT", name: string, value: string): void => {
  console.log(`${status} ${name}: ${value}`);
};

const warnLine = (warnings: string[], name: string, value: string): void => {
  warnings.push(name);
  printLine("WARN", name, value);
};

export const registerCheckCommand = (program: Command): void => {
  program
    .command("check")
    .description("Validate AgentGate policy and local runtime assumptions.")
    .option("--config <path>", "Path to agentgate.yml")
    .option("--strict", "Exit with failure when readiness warnings are present.")
    .action((options: CheckOptions) => {
      const loaded = loadPolicy(process.cwd(), options.config);
      if (!loaded) {
        console.error("FAIL policy: No agentgate.yml found");
        console.error("NEXT run: agentgate init --preset balanced");
        console.error("NEXT check again: agentgate check");
        process.exitCode = 1;
        return;
      }

      const { policy } = loaded;
      const root = path.resolve(path.dirname(loaded.path), loaded.policy.workspace.root);
      const credentialReadGuard = hasCredentialReadGuard(policy);
      const privateNetworkGuard = hasPrivateNetworkGuard(policy);
      const warnings: string[] = [];

      printLine("PASS", "policy", "valid");
      if (policy.mode === "monitor") {
        warnLine(warnings, "mode", "monitor records decisions without blocking them");
        printLine("NEXT", "enable enforcement", "set mode: enforce when ready");
      } else {
        printLine("PASS", "mode", policy.mode);
      }
      printLine("PASS", "workspace", root);
      printLine("PASS", "audit", policy.audit.path);
      if (policy.audit.redactSecrets) {
        printLine("PASS", "audit redaction", "enabled");
      } else {
        warnLine(warnings, "audit redaction", "disabled");
      }
      if (!policy.audit.redactSecrets) {
        printLine("NEXT", "enable audit redaction", "set audit.redactSecrets: true");
      }
      if (credentialReadGuard) {
        printLine("PASS", "credential read guard", "configured");
      } else {
        warnLine(warnings, "credential read guard", "missing");
      }
      if (!credentialReadGuard) {
        printLine("NEXT", "add credential guard", "run agentgate init --preset balanced --force or add neverRead patterns for credential paths");
      }
      if (privateNetworkGuard) {
        printLine("PASS", "private network guard", "configured");
      } else {
        warnLine(warnings, "private network guard", "missing");
      }
      if (!privateNetworkGuard) {
        printLine("NEXT", "add network guard", "deny private, loopback, and link-local fetches");
      }
      if (policy.approval.mode === "terminal") {
        printLine("PASS", "terminal approval", "enabled");
      } else {
        warnLine(warnings, "terminal approval", "disabled");
        printLine("NEXT", "enable terminal approval", "set approval.mode: terminal");
      }
      printLine("PASS", "rules", String(policy.rules.length));
      printLine("NEXT", "review audit events", "agentgate logs --review");
      if (options.strict === true && warnings.length > 0) {
        console.error(`FAIL readiness: ${warnings.length} warning(s) found`);
        process.exitCode = 1;
      }
    });
};
