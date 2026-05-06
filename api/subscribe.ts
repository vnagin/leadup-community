import { checkRateLimit, clientIp } from "../lib/rate-limit.js";
import { forwardToN8n } from "../lib/forward.js";
import { isAllowedSource, isValidEmail, maskEmail } from "../lib/validation.js";

export const config = { runtime: "edge" };

const RESEND_COOLDOWN_S = 60;

type SubscribePayload = {
  email?: unknown;
  first_name?: unknown;
  consent_152fz?: unknown;
  source?: unknown;
  honeypot?: unknown;
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
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return jsonResponse(
      429,
      { error: "rate_limited", retry_after_s: rl.retryAfterSec },
      { "Retry-After": String(rl.retryAfterSec) },
    );
  }

  let payload: SubscribePayload;
  try {
    payload = (await request.json()) as SubscribePayload;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  // Honeypot — silent 202, do not forward to n8n.
  const honeypot = typeof payload.honeypot === "string" ? payload.honeypot : "";
  if (honeypot.trim() !== "") {
    return jsonResponse(202, {
      status: "pending_confirm",
      masked_email: "***@***",
      resend_in_s: RESEND_COOLDOWN_S,
    });
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return jsonResponse(400, { error: "invalid_email" });
  }

  if (payload.consent_152fz !== true) {
    return jsonResponse(400, { error: "consent_required", field: "consent_152fz" });
  }

  if (!isAllowedSource(payload.source)) {
    return jsonResponse(400, { error: "invalid_source" });
  }

  const firstName =
    typeof payload.first_name === "string" ? payload.first_name.trim().slice(0, 80) : "";

  const forwardPayload = {
    email,
    first_name: firstName || null,
    consent_152fz: true,
    source: payload.source,
    page_url: request.headers.get("referer") ?? null,
    user_agent: request.headers.get("user-agent") ?? null,
    ip_country:
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null,
    submitted_at: new Date().toISOString(),
  };

  const upstream = await forwardToN8n(
    process.env.LE_OPTIN_WEBHOOK_URL,
    process.env.LE_OPTIN_WEBHOOK_SECRET,
    forwardPayload,
  );

  if (!upstream.ok) {
    return jsonResponse(500, { error: "internal" });
  }

  // n8n may return a richer body to drive UX (`already_subscribed`, etc.).
  // Default shape if n8n returns the mock body or a bare ack.
  const upstreamBody = upstream.body;
  if (
    upstreamBody &&
    typeof upstreamBody === "object" &&
    !Array.isArray(upstreamBody) &&
    typeof (upstreamBody as { status?: unknown }).status === "string"
  ) {
    const status = (upstreamBody as { status: string }).status;
    if (status === "already_subscribed") {
      return jsonResponse(200, {
        status: "already_subscribed",
        masked_email: maskEmail(email),
      });
    }
  }

  return jsonResponse(202, {
    status: "pending_confirm",
    masked_email: maskEmail(email),
    resend_in_s: RESEND_COOLDOWN_S,
  });
}
