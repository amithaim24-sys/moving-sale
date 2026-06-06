"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Owner/admin-only toolbar shown above a store's public catalog: the shareable
// public URL with a one-tap copy button. Rendered only to the store owner or a
// super-admin, never to buyers.
export default function StoreShareBar({ url }: { url: string }) {
  const t = useTranslations("store");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context / permissions) — select-to-copy still works.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-brand/5 p-3 ring-1 ring-brand/20 sm:flex-row sm:items-center dark:bg-brand/10">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-brand">
        {t("shareLabel")}
      </span>
      <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
        {url}
      </code>
      <button onClick={copy} className="btn-secondary shrink-0 text-sm" type="button">
        {copied ? t("copied") : t("copyLink")}
      </button>
    </div>
  );
}
