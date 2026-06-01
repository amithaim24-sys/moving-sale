import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "./src/i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});

// Build a strict, nonce-based Content-Security-Policy. A fresh nonce is minted per
// request and threaded to the one inline script we ship (the theme bootstrap in the
// locale layout) via the `x-nonce` header, so we never need 'unsafe-inline' for
// scripts. This is the primary defense-in-depth against XSS in user-generated
// content (item titles/descriptions).
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const directives = [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonce'd Next.js bootstrap load the rest of the app's
    // chunks without each needing its own nonce. Dev needs 'unsafe-eval' for HMR.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`.trim(),
    // Tailwind/Next inject style tags; styles can't execute JS, so 'unsafe-inline' here
    // is the standard, low-risk allowance.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://res.cloudinary.com https://lh3.googleusercontent.com`,
    `font-src 'self' data:`,
    // Cloudinary upload endpoint + same-origin API/auth calls.
    `connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ];
  return directives.join("; ");
}

export default function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Forward the nonce to the app as a request header so Server Components can read it
  // (via next/headers) and apply it to inline scripts. next-intl preserves incoming
  // request headers when it rewrites, so mutating req.headers here is sufficient.
  req.headers.set("x-nonce", nonce);
  const res = intlMiddleware(req);

  res.headers.set("content-security-policy", csp);
  res.headers.set("x-nonce", nonce);
  // HSTS: pin clients to HTTPS for a year (incl. subdomains) once seen over TLS.
  // Harmless on localhost/HTTP where browsers ignore it.
  res.headers.set(
    "strict-transport-security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return res;
}

export const config = {
  matcher: ["/", "/(en|he)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
