import { NextResponse } from "next/server";

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
