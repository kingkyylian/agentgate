import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { loadPolicy } from "../../config/loader.js";
import type { AgentGatePolicy } from "../../core/policy.js";
import { defaultNeverReadPatterns } from "../../guards/filesystem.js";

interface CheckOptions {
  config?: string;
  strict?: boolean;
  format?: string;
}

type CheckStatus = "pass" | "warn" | "fail";
type HygieneStatus = "pass" | "warn" | "skip";

interface CheckItem {
  name: string;
  status: CheckStatus;
  message: string;
}

interface CheckMetadata {
  name: string;
  message: string;
  remediation?: string;
}

interface NextStep {
  name: string;
  command?: string;
  message?: string;
}

interface CheckEntry {
  type: "check" | "next";
  item: CheckItem | NextStep;
}

interface CheckReport {
  schemaVersion: 1;
  ok: boolean;
  status: CheckStatus;
  strict: boolean;
  policyPath: string | null;
  workspaceRoot: string | null;
  policy: {
    mode: AgentGatePolicy["mode"];
    auditPath: string;
    auditRedaction: boolean;
    approvalMode: AgentGatePolicy["approval"]["mode"];
    rules: number;
  } | null;
  readiness: {
    mcp: {
      configured: boolean;
      upstreams: string[];
      setupCommand: string | null;
    };
    hygiene: {
      checkpointIgnore: HygieneStatus;
      packageSmoke: HygieneStatus;
    };
  };
  checks: CheckItem[];
  warnings: CheckMetadata[];
  failures: CheckMetadata[];
  next: NextStep[];
  entries: CheckEntry[];
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

const isInsideWorkspace = (workspaceRoot: string, candidatePath: string): boolean => {
  const relativePath = path.relative(workspaceRoot, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const gitignoreContains = (workspaceRoot: string, patterns: string[]): boolean => {
  const gitignorePath = path.join(workspaceRoot, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return false;

  const lines = fs.readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return patterns.some((pattern) => lines.includes(pattern));
};

const hasHardenedPackageSmoke = (workspaceRoot: string): boolean | null => {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, unknown>;
    };
    const smokePackage = packageJson.scripts?.["smoke:package"];
    return typeof smokePackage === "string" && smokePackage.includes("scripts/package-smoke.mjs");
  } catch {
    return false;
  }
};

const createReport = (strict: boolean, policyPath: string | null, workspaceRoot: string | null, policy: AgentGatePolicy | null): CheckReport => ({
  schemaVersion: 1,
  ok: true,
  status: "pass",
  strict,
  policyPath,
  workspaceRoot,
  policy: policy ? {
    mode: policy.mode,
    auditPath: policy.audit.path,
    auditRedaction: policy.audit.redactSecrets,
    approvalMode: policy.approval.mode,
    rules: policy.rules.length
  } : null,
  readiness: {
    mcp: {
      configured: false,
      upstreams: [],
      setupCommand: null
    },
    hygiene: {
      checkpointIgnore: "skip",
      packageSmoke: "skip"
    }
  },
  checks: [],
  warnings: [],
  failures: [],
  next: [],
  entries: []
});

const metadata = (name: string, message: string, remediation?: string): CheckMetadata =>
  remediation === undefined ? { name, message } : { name, message, remediation };

const addCheck = (report: CheckReport, status: CheckStatus, name: string, message: string, remediation?: string): void => {
  const item = { name, status, message };
  report.checks.push(item);
  report.entries.push({ type: "check", item });

  if (status === "warn") report.warnings.push(metadata(name, message, remediation));
  if (status === "fail") report.failures.push(metadata(name, message, remediation));
};

const addFailure = (report: CheckReport, name: string, message: string, remediation?: string): void => {
  report.failures.push(metadata(name, message, remediation));
};

const addNext = (report: CheckReport, name: string, commandOrMessage: string, kind: "command" | "message" = "command"): void => {
  const item = kind === "command" ? { name, command: commandOrMessage } : { name, message: commandOrMessage };
  report.next.push(item);
  report.entries.push({ type: "next", item });
};

const finalizeReport = (report: CheckReport): CheckReport => {
  report.ok = report.failures.length === 0;
  report.status = report.failures.length > 0 ? "fail" : report.warnings.length > 0 ? "warn" : "pass";
  return report;
};

const publicReport = (report: CheckReport): Omit<CheckReport, "entries"> => {
  const { entries: _entries, ...stableReport } = report;
  return stableReport;
};

const renderJsonReport = (report: CheckReport): void => {
  console.log(JSON.stringify(publicReport(report), null, 2));
};

const printLine = (status: "PASS" | "WARN" | "FAIL" | "NEXT", name: string, value: string, stream: "stdout" | "stderr" = "stdout"): void => {
  const line = `${status} ${name}: ${value}`;
  if (stream === "stderr") {
    console.error(line);
  } else {
    console.log(line);
  }
};

const renderTextReport = (report: CheckReport): void => {
  const missingPolicy = report.failures.some((failure) => failure.name === "policy");

  for (const entry of report.entries) {
    if (entry.type === "check") {
      const item = entry.item as CheckItem;
      const status = item.status.toUpperCase() as "PASS" | "WARN" | "FAIL";
      printLine(status, item.name, item.message, missingPolicy || item.status === "fail" ? "stderr" : "stdout");
    } else {
      const item = entry.item as NextStep;
      printLine("NEXT", item.name, item.command ?? item.message ?? "", missingPolicy ? "stderr" : "stdout");
    }
  }

  for (const failure of report.failures.filter((failure) => failure.name !== "policy")) {
    printLine("FAIL", failure.name, failure.message, "stderr");
  }
};

const buildMissingPolicyReport = (strict: boolean): CheckReport => {
  const report = createReport(strict, null, null, null);
  addCheck(report, "fail", "policy", "No agentgate.yml found", "agentgate init --preset balanced");
  addNext(report, "run", "agentgate init --preset balanced");
  addNext(report, "check again", "agentgate check");
  return finalizeReport(report);
};

const buildPolicyReport = (loaded: NonNullable<ReturnType<typeof loadPolicy>>, strict: boolean): CheckReport => {
  const { policy } = loaded;
  const root = path.resolve(path.dirname(loaded.path), loaded.policy.workspace.root);
  const credentialReadGuard = hasCredentialReadGuard(policy);
  const privateNetworkGuard = hasPrivateNetworkGuard(policy);
  const mcpUpstreams = Object.keys(policy.mcp?.upstreams ?? {}).sort();
  const report = createReport(strict, loaded.path, root, policy);
  report.readiness.mcp = {
    configured: mcpUpstreams.length > 0,
    upstreams: mcpUpstreams,
    setupCommand: mcpUpstreams[0] === undefined ? null : `agentgate mcp setup --server ${mcpUpstreams[0]} --launch global`
  };

  addCheck(report, "pass", "policy", "valid");
  if (policy.mode === "monitor") {
    addCheck(report, "warn", "mode", "monitor records decisions without blocking them", "set mode: enforce when ready");
    addNext(report, "enable enforcement", "set mode: enforce when ready", "message");
  } else {
    addCheck(report, "pass", "mode", policy.mode);
  }
  addCheck(report, "pass", "workspace", root);
  addCheck(report, "pass", "audit", policy.audit.path);
  if (isInsideWorkspace(root, path.resolve(root, policy.audit.path))) {
    addCheck(report, "pass", "audit path", "inside workspace");
  } else {
    addCheck(report, "warn", "audit path", "outside workspace", "store audit logs under the workspace, for example .agentgate/audit.jsonl");
    addNext(report, "move audit path", "store audit logs under the workspace, for example .agentgate/audit.jsonl", "message");
  }
  if (policy.audit.redactSecrets) {
    addCheck(report, "pass", "audit redaction", "enabled");
  } else {
    addCheck(report, "warn", "audit redaction", "disabled", "set audit.redactSecrets: true");
    addNext(report, "enable audit redaction", "set audit.redactSecrets: true", "message");
  }
  if (credentialReadGuard) {
    addCheck(report, "pass", "credential read guard", "configured");
  } else {
    addCheck(report, "warn", "credential read guard", "missing", "run agentgate init --preset balanced --force or add neverRead patterns for credential paths");
    addNext(report, "add credential guard", "run agentgate init --preset balanced --force or add neverRead patterns for credential paths", "message");
  }
  if (privateNetworkGuard) {
    addCheck(report, "pass", "private network guard", "configured");
  } else {
    addCheck(report, "warn", "private network guard", "missing", "deny private, loopback, and link-local fetches");
    addNext(report, "add network guard", "deny private, loopback, and link-local fetches", "message");
  }
  if (policy.approval.mode === "terminal") {
    addCheck(report, "pass", "terminal approval", "enabled");
  } else {
    addCheck(report, "warn", "terminal approval", "disabled", "set approval.mode: terminal");
    addNext(report, "enable terminal approval", "set approval.mode: terminal", "message");
  }
  if (mcpUpstreams.length > 0) {
    addCheck(report, "pass", "mcp proxy", `configured: ${mcpUpstreams.join(", ")}`);
  } else {
    addCheck(report, "pass", "mcp proxy", "not configured");
  }
  if (fs.existsSync(path.join(root, "docs/checkpoints"))) {
    if (gitignoreContains(root, ["docs/checkpoints/", "docs/checkpoints", "docs/checkpoints/**"])) {
      report.readiness.hygiene.checkpointIgnore = "pass";
      addCheck(report, "pass", "checkpoint ignore", "configured");
    } else {
      report.readiness.hygiene.checkpointIgnore = "warn";
      addCheck(report, "warn", "checkpoint ignore", "docs/checkpoints/ is not ignored", "add docs/checkpoints/ to .gitignore");
      addNext(report, "ignore checkpoints", "add docs/checkpoints/ to .gitignore", "message");
    }
  } else {
    addCheck(report, "pass", "checkpoint ignore", "not present");
  }
  const packageSmoke = hasHardenedPackageSmoke(root);
  if (packageSmoke === null) {
    addCheck(report, "pass", "package smoke", "not applicable");
  } else if (packageSmoke) {
    report.readiness.hygiene.packageSmoke = "pass";
    addCheck(report, "pass", "package smoke", "configured");
  } else {
    report.readiness.hygiene.packageSmoke = "warn";
    addCheck(report, "warn", "package smoke", "missing hardened package smoke", "set scripts.smoke:package to node scripts/package-smoke.mjs");
    addNext(report, "harden package smoke", "set scripts.smoke:package to node scripts/package-smoke.mjs", "message");
  }
  addCheck(report, "pass", "rules", String(policy.rules.length));
  addNext(report, "review audit events", "agentgate logs --review");

  if (strict && report.warnings.length > 0) {
    addFailure(report, "readiness", `${report.warnings.length} warning(s) found`, "resolve warnings or rerun without --strict");
  }

  return finalizeReport(report);
};

export const registerCheckCommand = (program: Command): void => {
  program
    .command("check")
    .description("Validate AgentGate policy and local runtime assumptions.")
    .option("--config <path>", "Path to agentgate.yml")
    .option("--strict", "Exit with failure when readiness warnings are present.")
    .option("--format <format>", "Output format: text or json.", "text")
    .action((options: CheckOptions) => {
      if (options.format !== undefined && !["text", "json"].includes(options.format)) {
        throw new Error(`Unsupported check format: ${options.format}. Expected text or json.`);
      }

      const loaded = loadPolicy(process.cwd(), options.config);
      const report = loaded ? buildPolicyReport(loaded, options.strict === true) : buildMissingPolicyReport(options.strict === true);

      if (options.format === "json") {
        renderJsonReport(report);
      } else {
        renderTextReport(report);
      }

      if (!report.ok) {
        process.exitCode = 1;
      }
    });
};
