"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toaster";

export type CollaboratorRow = {
  id: string;
  name: string | null;
  email: string;
};

export default function CollaboratorsManager({
  initial,
}: {
  initial: CollaboratorRow[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<CollaboratorRow[]>(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    try {
      const res = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error.body"), "error");
        return;
      }
      setEmail("");
      toast.show(t("collab.added"));
      router.refresh();
    } catch {
      toast.show(t("error.body"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("collab.confirmRemove"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/collaborators/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error.body"), "error");
        return;
      }
      setRows((p) => p.filter((r) => r.id !== id));
      toast.show(t("collab.removed"));
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
        <label htmlFor="collab-email" className="label">
          {t("collab.addLabel")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="collab-email"
            type="email"
            inputMode="email"
            className="field flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("collab.emailPlaceholder")}
          />
          <button disabled={busy || !email.trim()} className="btn-primary disabled:opacity-60">
            {busy && <Spinner />}
            {t("collab.addButton")}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("collab.addHelp")}</p>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{t("collab.none")}</p>
      ) : (
        <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name ?? r.email}</div>
                <div className="truncate text-xs text-slate-500">{r.email}</div>
              </div>
              <button
                onClick={() => remove(r.id)}
                disabled={busy}
                className="btn-danger text-xs disabled:opacity-60"
              >
                {t("collab.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
