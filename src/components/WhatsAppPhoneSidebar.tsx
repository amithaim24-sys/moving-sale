"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_PHONE_PREFIX } from "@/lib/types";

export default function WhatsAppPhoneSidebar({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (phone: string) => void;
  initial?: string;
}) {
  const t = useTranslations();
  const [phone, setPhone] = useState(initial && initial.length > 0 ? initial : DEFAULT_PHONE_PREFIX);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappPhone: phone }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    onSaved(phone);
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed top-0 z-50 h-full w-80 max-w-[90vw] bg-white shadow-xl transition-transform end-0 dark:bg-slate-900 ${
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{t("form.phone")}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>
        <div className="space-y-4 p-4">
          <input
            className="field"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+972501234567"
            dir="ltr"
          />
          <p className="text-xs text-slate-500">{t("form.phoneHelp")}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {t("form.save")}
          </button>
        </div>
      </aside>
    </>
  );
}
