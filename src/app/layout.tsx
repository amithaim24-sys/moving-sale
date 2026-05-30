import "./globals.css";
import type { Metadata, Viewport } from "next";

// Root layout — locale-specific layout lives at app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "We move, you earn", template: "%s · We move, you earn" },
  description: "Items for sale or to give away before the move",
  applicationName: "Moving Sale",
  openGraph: { siteName: "We move, you earn", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0f766e" };
