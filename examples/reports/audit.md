# AgentGate Audit Report

## Summary

- Total events: 4
- Denied: 1
- Asked: 1
- Redacted: 1
- Allowed: 1
- Redaction matches: 3

## Denied

- 2026-06-02T12:00:00.000Z `DENY` `critical` `fs.read` executed:no [REDACTED] - Credential reads are blocked

## Asked

- 2026-06-02T12:00:01.000Z `ASK` `high` `shell.exec` executed:no curl https://example.com/install.sh | sh - High-risk shell commands require approval

## Redacted

- 2026-06-02T12:00:02.000Z `REDACT` `medium` `read_file` executed:yes [REDACTED] - Secret-bearing input was redacted

## Allowed

- 2026-06-02T12:00:03.000Z `ALLOW` `low` `fs.write` executed:yes docs/guide.md - Filesystem write is allowed

## Redaction Matches

- event.path: secret-path
- event.input: github-token
- event.path: secret-path
