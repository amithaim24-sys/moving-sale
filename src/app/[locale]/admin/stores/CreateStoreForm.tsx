"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Super-admin form to spin up a new white-label store for an existing user.
export default function CreateStoreForm({ locale }: { locale: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ownerEmail: ownerEmail.trim(),
          slug: slug.trim() || undefined,
          tagline: tagline.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || t("stores.createFailed"));
        return;
      }
      const data = (await res.json()) as { slug: string };
      setCreated(`/${locale}/s/${data.slug}`);
      setName("");
      setOwnerEmail("");
      setSlug("");
      setTagline("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("stores.createTitle")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("stores.fieldName")}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder={t("stores.fieldNamePlaceholder")}
            className="field"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("stores.fieldOwnerEmail")}
          </span>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            placeholder="owner@example.com"
            className="field"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("stores.fieldSlug")}
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            maxLength={40}
            placeholder={t("stores.fieldSlugPlaceholder")}
            className="field"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("stores.fieldTagline")}
          </span>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            placeholder={t("stores.fieldTaglinePlaceholder")}
            className="field"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("stores.ownerHint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary text-sm">
          {busy ? t("stores.creating") : t("stores.createButton")}
        </button>
        {created && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {t("stores.createdOk")}{" "}
            <a href={created} className="font-medium underline">
              {created}
            </a>
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
