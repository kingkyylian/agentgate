import net from "node:net";
import type { PolicyDecision } from "../core/decision.js";
import { allowDecision, denyDecision } from "../core/decision.js";
import type { ToolEvent } from "../core/event.js";
import type { AgentGatePolicy } from "../core/policy.js";

const isPrivateIpv4 = (host: string): boolean => {
  const parts = host.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === undefined || b === undefined) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

const isLinkLocalIpv4 = (host: string): boolean => host.startsWith("169.254.");
const isLoopbackIpv4 = (host: string): boolean => host.startsWith("127.");

export const evaluateHttpEvent = (policy: AgentGatePolicy, event: ToolEvent): PolicyDecision => {
  if (event.kind !== "http.fetch") return allowDecision("Not an HTTP event");
  if (!event.url) return denyDecision("http-missing-url", "HTTP event is missing URL", "high");

  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    return denyDecision("http-invalid-url", `Invalid URL is blocked: ${event.url}`, "high");
  }

  const host = url.hostname.toLowerCase();
  const matchingUrlRule = policy.rules.find((rule) => {
    if (!rule.urls) return false;
    if (rule.tools && !rule.tools.includes("http.fetch") && !rule.tools.includes(event.toolName)) return false;
    return true;
  });
  const denyPrivateNetworks = matchingUrlRule?.urls?.denyPrivateNetworks ?? true;
  const denyLinkLocal = matchingUrlRule?.urls?.denyLinkLocal ?? true;
  const denyLoopback = matchingUrlRule?.urls?.denyLoopback ?? true;

  if (denyLoopback && (host === "localhost" || host.endsWith(".localhost") || host === "::1" || isLoopbackIpv4(host))) {
    return denyDecision("http-loopback-denied", `Loopback fetch is blocked: ${host}`, "high");
  }

  if (denyLinkLocal && (host.endsWith(".local") || isLinkLocalIpv4(host) || host.toLowerCase().startsWith("fe80:"))) {
    return denyDecision("http-link-local-denied", `Link-local fetch is blocked: ${host}`, "critical");
  }

  if (denyPrivateNetworks && (isPrivateIpv4(host) || host.toLowerCase().startsWith("fc") || net.isIP(host) === 6 && host.toLowerCase().startsWith("fd"))) {
    return denyDecision("http-private-network-denied", `Private-network fetch is blocked: ${host}`, "high");
  }

  return allowDecision(`HTTP fetch is allowed: ${url.origin}`);
};
