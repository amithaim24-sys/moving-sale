import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Drop the "X-Powered-By: Next.js" header — it leaks the stack for no benefit.
  poweredByHeader: false,
  // Tree-shake heavy barrel-export packages so only the symbols we actually use
  // are bundled, trimming client JS.
  experimental: {
    optimizePackageImports: ["next-intl", "@vercel/analytics", "@vercel/speed-insights"],
  },
  images: {
    // Serve modern formats first — AVIF/WebP are dramatically smaller than the
    // original JPEG/PNG coming from Cloudinary, and next/image negotiates per
    // browser. Cloudinary asset URLs are content-addressed and immutable, so we
    // let Vercel cache each optimized variant for a long time (31 days) instead
    // of re-optimizing on every request.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
