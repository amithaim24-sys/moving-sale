import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Reject cross-site state-changing requests (defense-in-depth on top of the
// session cookie's SameSite attribute). Prefers the Fetch Metadata signal and
// falls back to comparing Origin against Host.
export function isSameOrigin(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";

  const origin = req.headers.get("origin");
  // Same-origin server calls and non-browser clients may omit Origin entirely;
  // those still require a valid session cookie to do anything, so allow them.
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function csrfBlock(req: Request): NextResponse | null {
  return isSameOrigin(req) ? null : new NextResponse("Cross-site request blocked", { status: 403 });
}

// Best-effort client IP from the proxy headers Vercel sets. We prefer `x-real-ip`
// (the connecting IP as seen by Vercel's edge) over the leftmost `x-forwarded-for`
// entry, which a client can prepend and therefore spoof. Still best-effort: for
// hard guarantees a trusted edge signal is required.
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// Best-effort, per-instance rate limiter. On serverless this only throttles
// within a single warm instance — for hard global guarantees back this with
// Upstash/Vercel KV. It still meaningfully blunts single-client abuse loops.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export function rateLimitBlock(key: string, limit: number, windowMs: number): NextResponse | null {
  return rateLimit(key, limit, windowMs)
    ? null
    : new NextResponse("Too many requests", { status: 429 });
}

// --- Durable, cross-instance rate limiting (Upstash Redis over REST) ----------
//
// The in-memory limiter above only throttles within a single warm serverless
// instance, so the effective global limit on a public endpoint is (configured
// limit x number of live instances). For the abuse-sensitive public writes
// (website-requests, visit beacon, client log, contact hand-off) we want ONE
// shared counter across every instance. This uses Upstash Redis' HTTP API, which
// is serverless-friendly (no socket pooling) and the standard pairing with Vercel.
//
// It is wired so the app is safe to deploy with or without a Redis configured:
//   - No KV/Upstash env vars  -> transparently falls back to the in-memory limiter.
//   - Redis configured but a call fails -> degrades to in-memory (fail-soft) so a
//     transient Redis hiccup never blocks real users on a telemetry/lead endpoint.
// Connect a store and the durable path lights up on the next deploy automatically.

// Read either Vercel's KV-prefixed vars (set by the Vercel Marketplace Upstash
// integration) or the native Upstash names, whichever the connected store injects.
function redisEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const env = redisEnv();
  _redis = env ? new Redis({ url: env.url, token: env.token }) : null;
  return _redis;
}

// True when a shared Redis is configured — handy for diagnostics / a health route.
export function hasDurableRateLimiter(): boolean {
  return redisEnv() !== null;
}

// Fixed-window counter in Redis (same semantics as the in-memory limiter): INCR
// the bucket, set the window TTL on the first hit, allow while count <= limit.
export async function rateLimitDurable(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return rateLimit(key, limit, windowMs);
  try {
    const k = `rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.pexpire(k, windowMs);
    return count <= limit;
  } catch {
    // Redis unavailable — don't hard-fail the request; keep per-instance protection.
    return rateLimit(key, limit, windowMs);
  }
}

export async function rateLimitBlockDurable(
  key: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  return (await rateLimitDurable(key, limit, windowMs))
    ? null
    : new NextResponse("Too many requests", { status: 429 });
}
