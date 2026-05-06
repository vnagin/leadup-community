import { checkRateLimit, clientIp } from "../../lib/rate-limit.js";
import { forwardToN8n } from "../../lib/forward.js";
import { isValidEmail, maskEmail } from "../../lib/validation.js";

export const config = { runtime: "edge" };

type ConfirmPayload = {
  email?: unknown;
  ts?: unknown;
  token?: unknown;
};

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" }, { Allow: "POST" });
  }

  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return jsonResponse(400, { error: "invalid_content_type" });
  }

  const ip = clientIp(request);
  const rl = checkRateLimit(ip, "confirm");
  if (!rl.allowed) {
    return jsonResponse(
      429,
      { error: "rate_limited", retry_after_s: rl.retryAfterSec },
      { "Retry-After": String(rl.retryAfterSec) },
    );
  }

  let payload: ConfirmPayload;
  try {
    payload = (await request.json()) as ConfirmPayload;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const ts = typeof payload.ts === "string" ? payload.ts : "";
  const token = typeof payload.token === "string" ? payload.token : "";

  if (!isValidEmail(email) || !ts || !token) {
    return jsonResponse(401, { error: "invalid_token" });
  }

  // n8n is authoritative for HMAC verification + TTL check (it owns the
  // shared secret). Proxy forwards opaquely and maps n8n's verdict to our
  // public response shape.
  const upstream = await forwardToN8n(
    process.env.LE_OPTIN_CONFIRM_WEBHOOK_URL,
    process.env.LE_OPTIN_WEBHOOK_SECRET,
    { email, ts, token, submitted_at: new Date().toISOString() },
    "confirm",
  );

  if (!upstream.ok) {
    return jsonResponse(500, { error: "internal" });
  }

  const body = upstream.body;
  const status =
    body && typeof body === "object" && !Array.isArray(body) && typeof (body as { status?: unknown }).status === "string"
      ? (body as { status: string }).status
      : "";

  switch (status) {
    case "confirmed":
      return jsonResponse(200, { status: "confirmed", masked_email: maskEmail(email) });
    case "already_confirmed":
      return jsonResponse(200, { status: "already_confirmed", masked_email: maskEmail(email) });
    case "expired":
      return jsonResponse(410, { error: "expired" });
    case "invalid_token":
      return jsonResponse(401, { error: "invalid_token" });
    case "queued-mock":
      // Local/preview without n8n wired — assume happy-path for UI testing.
      return jsonResponse(200, { status: "confirmed", masked_email: maskEmail(email) });
    default:
      return jsonResponse(500, { error: "internal" });
  }
}
