# AgentGate Threat Model

AgentGate is a policy gateway for AI agent tool calls. It is not an OS sandbox, VM, container runtime, malware scanner, or complete data-loss-prevention system.

## Protects

- Accidental secret reads through guarded filesystem or MCP calls.
- Risky shell commands that pass through `agentgate exec`.
- Unsafe filesystem writes outside configured workspace paths.
- HTTP fetches to loopback, private-network, and link-local targets when policy denies them.
- Audit gaps by writing local JSONL records for allowed, denied, asked, and redacted events.

## Does Not Protect

- Tools that bypass AgentGate.
- Malicious local users with direct shell access.
- Agents granted direct credentials outside the policy layer.
- Kernel, container, browser, or network isolation.
- Full shell semantics; shell risk classification uses conservative heuristics.
- Every possible secret format.

## Trust Assumptions

- The developer controls the local machine.
- `agentgate.yml` is reviewed and committed intentionally.
- MCP clients are configured to call AgentGate instead of raw upstream servers.
- Approval prompts are reviewed by a human before allowing high-risk events.

## Recommended Use

- Use AgentGate alongside normal OS permissions.
- Keep real secrets out of repositories.
- Run untrusted agents in a container or VM when stronger isolation is required.
- Commit `agentgate.yml` and review policy changes in PRs.
