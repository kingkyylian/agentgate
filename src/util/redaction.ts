export interface RedactionMatch {
  field: string;
  pattern: string;
}

interface RedactionPattern {
  name: string;
  pattern: RegExp;
}

const patterns: RedactionPattern[] = [
  { name: "openai-key", pattern: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "github-token", pattern: /(?:ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/g },
  { name: "anthropic-key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/g },
  { name: "private-key-block", pattern: /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g },
  { name: "secret-path", pattern: /(?:^|[\s"'`])(?:\.env(?:\.[^\s"'`]*)?|\.ssh\/[^\s"'`]+|\.gnupg\/[^\s"'`]+|\.aws\/[^\s"'`]+|[^\s"'`]*\/secrets\/[^\s"'`]+|[^\s"'`]+\.(?:pem|key)|[^\s"'`]*_rsa|[^\s"'`]*id_ed25519)(?=$|[\s"'`,}])/g },
  { name: "secret-assignment", pattern: /\b(api_key|token|secret|password)\s*=\s*["']?[^"'\s]+/gi }
];

export const redactText = (field: string, value: string): { text: string; matches: RedactionMatch[] } => {
  let text = value;
  const matches: RedactionMatch[] = [];

  for (const item of patterns) {
    if (item.pattern.test(text)) {
      matches.push({ field, pattern: item.name });
      text = text.replace(item.pattern, "[REDACTED]");
    }
    item.pattern.lastIndex = 0;
  }

  return { text, matches };
};

export const redactUnknown = (field: string, value: unknown): { value: unknown; matches: RedactionMatch[] } => {
  if (typeof value === "string") {
    const result = redactText(field, value);
    return {
      value: result.text,
      matches: result.matches
    };
  }
  if (value === null || value === undefined) return { value, matches: [] };

  const rendered = JSON.stringify(value);
  const result = redactText(field, rendered);

  if (result.matches.length === 0) return { value, matches: [] };

  return {
    value: result.text,
    matches: result.matches
  };
};
