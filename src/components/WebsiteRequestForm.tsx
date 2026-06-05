"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toaster";

// Shared "I want a website like this" lead form. Records the visitor as a
// WebsiteRequest the admin can follow up with (see /admin/requests). Used both
// inline at the bottom of the catalog and inside the header CTA modal.
export default function WebsiteRequestForm({
  defaultName,
  defaultEmail,
  onSuccess,
}: {
  defaultName?: string | null;
  defaultEmail?: string | null;
  onSuccess?: () => void;
}) {
  const t = useTranslations("duplicate");
  const toast = useToast();
  const uid = useId();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState("");
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
        body: JSON.stringify({
          name: name.trim(),
          email: value,
          phone: phone.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error"), "error");
        return;
      }
      setDone(true);
      toast.show(t("success"));
      onSuccess?.();
    } catch {
      toast.show(t("error"), "error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-sm font-medium text-brand">{t("thanks")}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-start">
      <div>
        <label htmlFor={`${uid}-name`} className="label">
          {t("name")}
        </label>
        <input
          id={`${uid}-name`}
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="label">
          {t("email")}
        </label>
        <input
          id={`${uid}-email`}
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
        <label htmlFor={`${uid}-phone`} className="label">
          {t("phone")}
        </label>
        <input
          id={`${uid}-phone`}
          type="tel"
          inputMode="tel"
          className="field"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phonePlaceholder")}
          autoComplete="tel"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-message`} className="label">
          {t("message")}
        </label>
        <textarea
          id={`${uid}-message`}
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
  );
}
