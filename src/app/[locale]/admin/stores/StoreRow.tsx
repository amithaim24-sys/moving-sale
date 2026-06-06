"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Store = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  active: boolean;
  itemCount: number;
  ownerName: string | null;
  ownerEmail: string;
  createdLabel: string;
  url: string;
};

export default function StoreRow({
  locale,
  store,
  labels,
}: {
  locale: string;
  store: Store;
  labels: {
    open: string;
    copyLink: string;
    copied: string;
    activate: string;
    deactivate: string;
    active: string;
    inactive: string;
    delete: string;
    confirmDelete: string;
    items: string;
    actionFailed: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || labels.actionFailed);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(labels.confirmDelete)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || labels.actionFailed);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(store.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900 dark:text-white">{store.name}</h3>
            <span
              className={
                store.active
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }
            >
              {store.active ? labels.active : labels.inactive}
            </span>
          </div>
          {store.tagline && (
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{store.tagline}</p>
          )}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {store.ownerName ? `${store.ownerName} · ` : ""}
            {store.ownerEmail} · {labels.items.replace("{count}", String(store.itemCount))} ·{" "}
            {store.createdLabel}
          </p>
          <a
            href={`/${locale}/s/${store.slug}`}
            className="mt-1 inline-block break-all text-xs font-medium text-brand hover:underline"
          >
            /{locale}/s/{store.slug}
          </a>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            <a
              href={`/${locale}/s/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              {labels.open}
            </a>
            <button onClick={copy} disabled={busy} className="btn-secondary text-xs" type="button">
              {copied ? labels.copied : labels.copyLink}
            </button>
            <button
              onClick={() => patch({ active: !store.active })}
              disabled={busy}
              className="btn-secondary text-xs"
              type="button"
            >
              {store.active ? labels.deactivate : labels.activate}
            </button>
            <button onClick={remove} disabled={busy} className="btn-danger text-xs" type="button">
              {labels.delete}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </li>
  );
}
