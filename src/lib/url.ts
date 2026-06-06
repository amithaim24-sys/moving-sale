import { headers } from "next/headers";

// Configured base URL, used when there's no live request to read a host from
// (e.g. sitemap/robots at build time). Mirrors sitemap.ts/robots.ts.
function configuredBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

// Build an absolute URL for `path` (which should start with "/"). Prefers the
// incoming request's forwarded host/proto so a copied share link matches whatever
// domain the user is actually on (custom domain, vercel.app, localhost). Falls
// back to the configured base when no request headers are available.
export async function absoluteUrl(path: string): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}${path}`;
    }
  } catch {
    // Outside a request scope — fall through to the configured base.
  }
  return `${configuredBase()}${path}`;
}
