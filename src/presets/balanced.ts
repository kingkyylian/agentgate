import type { AgentGatePolicy } from "../core/policy.js";

const credentialPathPatterns = [
  ".env",
  ".env.*",
  ".ssh/**",
  ".gnupg/**",
  ".aws/**",
  "**/*.pem",
  "**/*.key",
  "**/*_rsa",
  "**/id_ed25519",
  "**/secrets/**",
  "**/.npmrc",
  "**/.pypirc"
];

export const balancedPolicy = (): AgentGatePolicy => ({
  version: 1,
  mode: "enforce",
  workspace: {
    root: ".",
    readable: ["**"],
    writable: ["src/**", "tests/**", "docs/**", "examples/**", "package.json", "pnpm-lock.yaml", "README.md"],
    neverRead: [...credentialPathPatterns]
  },
  audit: {
    path: ".agentgate/audit.jsonl",
    redactSecrets: true
  },
  approval: {
    mode: "terminal"
  },
  rules: [
    {
      id: "deny-private-key-reads",
      effect: "deny",
      tools: ["fs.read", "mcp.tool", "read_file"],
      paths: [...credentialPathPatterns],
      reason: "Credential reads are blocked"
    },
    {
      id: "ask-dangerous-shell",
      effect: "ask",
      tools: ["shell.exec"],
      commandRisk: {
        min: "high"
      },
      reason: "High-risk shell commands require approval"
    },
    {
      id: "deny-metadata-fetch",
      effect: "deny",
      tools: ["http.fetch", "mcp.tool", "fetch"],
      urls: {
        denyPrivateNetworks: true,
        denyLinkLocal: true,
        denyLoopback: true
      },
      reason: "Private, loopback, and metadata network fetches are blocked"
    }
  ]
});
