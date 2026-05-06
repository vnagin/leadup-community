// Forward helper: POST to n8n webhook with HMAC shared-secret header.
// Payload is opaque — caller passes whatever n8n expects.

export type ForwardResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; reason: string; body?: unknown };

export async function forwardToN8n(
  url: string | undefined,
  secret: string | undefined,
  payload: unknown,
): Promise<ForwardResult> {
  if (!url) {
    // Mock-mode for local/preview without n8n wired up — let the form UI flow
    // be testable. In prod both env vars must be set.
    console.info("[forward] mock-mode (LE_OPTIN_WEBHOOK_URL unset)", { payload });
    return { ok: true, status: 202, body: { status: "queued-mock" } };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Webhook-Secret": secret } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
    if (!response.ok) {
      return { ok: false, status: response.status, reason: "n8n-non-2xx", body };
    }
    return { ok: true, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      reason: error instanceof Error ? error.message : "fetch-failed",
    };
  }
}
