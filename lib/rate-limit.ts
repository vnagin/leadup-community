// Best-effort per-IP sliding-window rate-limit for Vercel Edge runtime.
//
// Two tiers: 5 req/min/IP + 30 req/hour/IP. State lives in `globalThis` Map
// scoped to one Edge instance — distributed instances do not share state, but
// Vercel's edge regions tend to pin a client IP to the same POP for short
// windows, so this is a sane MVP without external KV. If bot-traffic spikes
// past comfort, swap for Upstash Redis (separate child issue).

type Bucket = { minute: number[]; hour: number[] };

const STORE_KEY = "__leadup_rl_v1";

declare global {
  // eslint-disable-next-line no-var
  var __leadup_rl_v1: Map<string, Bucket> | undefined;
}

function getStore(): Map<string, Bucket> {
  const g = globalThis as { [k: string]: unknown };
  let store = g[STORE_KEY] as Map<string, Bucket> | undefined;
  if (!store) {
    store = new Map();
    g[STORE_KEY] = store;
  }
  return store;
}

const MIN_WINDOW_MS = 60 * 1000;
const HOUR_WINDOW_MS = 60 * 60 * 1000;
const PER_MIN_LIMIT = 5;
const PER_HOUR_LIMIT = 30;

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function checkRateLimit(ip: string): RateLimitDecision {
  if (!ip) return { allowed: true };
  const store = getStore();
  const now = Date.now();

  const bucket = store.get(ip) ?? { minute: [], hour: [] };
  bucket.minute = bucket.minute.filter((t) => now - t < MIN_WINDOW_MS);
  bucket.hour = bucket.hour.filter((t) => now - t < HOUR_WINDOW_MS);

  if (bucket.minute.length >= PER_MIN_LIMIT) {
    const oldest = bucket.minute[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((MIN_WINDOW_MS - (now - oldest)) / 1000));
    store.set(ip, bucket);
    return { allowed: false, retryAfterSec };
  }
  if (bucket.hour.length >= PER_HOUR_LIMIT) {
    const oldest = bucket.hour[0] ?? now;
    const retryAfterSec = Math.max(60, Math.ceil((HOUR_WINDOW_MS - (now - oldest)) / 1000));
    store.set(ip, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.minute.push(now);
  bucket.hour.push(now);
  store.set(ip, bucket);

  // Lightweight LRU pruning to bound memory in long-lived edge instances.
  if (store.size > 5000) {
    const cutoff = now - HOUR_WINDOW_MS;
    for (const [key, b] of store) {
      if ((b.hour[b.hour.length - 1] ?? 0) < cutoff) store.delete(key);
    }
  }

  return { allowed: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}
