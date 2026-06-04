"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toaster";

// Public call-to-action shown at the bottom of the catalog: "Want a website like
// this?". Opens an inline form that records the visitor as a lead the admin can
// follow up with. Prefilled from the signed-in user when available.
export default function DuplicateSiteCTA({
  defaultName,
  defaultEmail,
}: {
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const t = useTranslations("duplicate");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    try {
      const res = await fetch("/api/website-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: value, message: message.trim() }),
      });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error"), "error");
        return;
      }
      setDone(true);
      toast.show(t("success"));
    } catch {
      toast.show(t("error"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 p-6 text-center ring-1 ring-brand/20 dark:from-brand/20 dark:to-brand/10">
      <h2 className="text-lg font-bold sm:text-xl">{t("heading")}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {t("subheading")}
      </p>

      {done ? (
        <p className="mt-4 text-sm font-medium text-brand">{t("thanks")}</p>
      ) : open ? (
        <form onSubmit={submit} className="mx-auto mt-4 max-w-md space-y-3 text-start">
          <div>
            <label htmlFor="dup-name" className="label">
              {t("name")}
            </label>
            <input
              id="dup-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="dup-email" className="label">
              {t("email")}
            </label>
            <input
              id="dup-email"
              type="email"
              inputMode="email"
              required
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="dup-message" className="label">
              {t("message")}
            </label>
            <textarea
              id="dup-message"
              className="field min-h-[5rem]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              maxLength={1000}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {busy && <Spinner />}
            {t("submit")}
          </button>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-primary mt-4">
          {t("cta")}
        </button>
      )}
    </section>
  );
}
