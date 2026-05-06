// RFC-ish email regex, intentionally lax (server-side n8n re-validates).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_SOURCES = new Set([
  "neurosborka-free",
  "neurosborka-pro",
]);

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

export function isAllowedSource(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_SOURCES.has(value);
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}
