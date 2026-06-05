"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toaster";

export type WaitlisterRow = {
  id: string;
  name: string;
  phone: string;
  notifiedAt: string | null;
};

export default function WaitlistManager({
  itemId,
  itemTitle,
  itemPath,
  priceLabel,
  initial,
}: {
  itemId: string;
  itemTitle: string;
  itemPath: string;
  priceLabel: string | null;
  initial: WaitlisterRow[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<WaitlisterRow[]>(initial);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  // The "it's ready" message the owner sends. Built client-side so the wa.me deep
  // link carries an absolute URL back to the public listing.
  function readyMessage(toName: string) {
    const item = priceLabel ? `${itemTitle} (${priceLabel})` : itemTitle;
    const url = `${window.location.origin}${itemPath}`;
    return t("waitlist.readyMessage", { name: toName, item, url });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    if (!n || !p) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${itemId}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, phone: p }),
      });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error.body"), "error");
        return;
      }
      const created: WaitlisterRow = await res.json();
      setRows((prev) => [...prev, created]);
      setName("");
      setPhone("");
      toast.show(t("waitlist.added"));
      router.refresh();
    } catch {
      toast.show(t("error.body"), "error");
    } finally {
      setBusy(false);
    }
  }

  function sendMessage(row: WaitlisterRow) {
    const digits = row.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(readyMessage(row.name))}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    // Optimistically flag as notified; persist in the background.
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, notifiedAt: new Date().toISOString() } : r)),
    );
    fetch(`/api/items/${itemId}/waitlist/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notified: true }),
    }).catch(() => {});
  }

  async function remove(id: string) {
    if (!confirm(t("waitlist.confirmRemove"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${itemId}/waitlist/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error.body"), "error");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.show(t("waitlist.removed"));
      router.refresh();
    } catch {
      toast.show(t("error.body"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={add}
        className="space-y-3 rounded-2xl bg-white p-5 shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="wl-name" className="label">
              {t("waitlist.nameLabel")}
            </label>
            <input
              id="wl-name"
              className="field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("waitlist.namePlaceholder")}
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="wl-phone" className="label">
              {t("waitlist.phoneLabel")}
            </label>
            <input
              id="wl-phone"
              type="tel"
              inputMode="tel"
              className="field w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("waitlist.phonePlaceholder")}
              maxLength={30}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("waitlist.addHelp")}</p>
          <button
            disabled={busy || !name.trim() || !phone.trim()}
            className="btn-primary disabled:opacity-60"
          >
            {busy && <Spinner />}
            {t("waitlist.addButton")}
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{t("waitlist.none")}</p>
      ) : (
        <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{r.name}</span>
                  {r.notifiedAt && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      ✓ {t("waitlist.notified")}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500" dir="ltr">
                  {r.phone}
                </div>
              </div>
              <button
                onClick={() => sendMessage(r)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#1ebe57]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 018.413 3.488 11.82 11.82 0 013.48 8.413c-.003 6.555-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.371s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
                {t("waitlist.sendReady")}
              </button>
              <button
                onClick={() => remove(r.id)}
                disabled={busy}
                className="btn-danger text-xs disabled:opacity-60"
              >
                {t("waitlist.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
