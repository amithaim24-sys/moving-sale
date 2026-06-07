"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Compact share control for the My Items header: a small button that copies the
// store's public URL to the clipboard. Replaces the large share card so the page
// header stays tight. Rendered only to the store owner.
export default function StoreShareButton({ url }: { url: string }) {
  const t = useTranslations("store");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context / permissions) — silently no-op.
    }
  }

  return (
    <button
      onClick={copy}
      type="button"
      className="btn-secondary text-sm"
      title={url}
    >
      🔗 {copied ? t("copied") : t("copyLink")}
    </button>
  );
}
