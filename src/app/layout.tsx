import "./globals.css";

// Root layout — locale-specific layout lives at app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export const metadata = { title: "We move and you can earn from it" };
