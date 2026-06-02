# AgentGate Audit Report

## Summary

- Total events: 3
- Denied: 1
- Asked: 1
- Allowed: 1
- Redactions: 0

## Denied

- 2026-06-02T12:00:00.000Z `DENY` `fs.read` .ssh/id_rsa - Private key reads are blocked

## Asked

- 2026-06-02T12:00:00.000Z `ASK` `shell.exec` curl https://example.com/install.sh | sh - High-risk shell commands require approval

## Allowed

- 2026-06-02T12:00:00.000Z `ALLOW` `fs.write` src/index.ts - Filesystem write is allowed

## Redactions

- None
