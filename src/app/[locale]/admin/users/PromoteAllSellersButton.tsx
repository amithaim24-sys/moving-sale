"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PromoteAllSellersButton() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [promotedCount, setPromotedCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  async function handleClick() {
    if (!window.confirm(t("makeAllSellersConfirm"))) return;
    setBusy(true);
    setPromotedCount(null);
    setError(false);
    try {
      const res = await fetch("/api/admin/users/promote-all-sellers", { method: "POST" });
      if (!res.ok) throw new Error("Request failed");
      const { count } = (await res.json()) as { count: number };
      setPromotedCount(count);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button disabled={busy} onClick={handleClick} className="btn-secondary text-sm">
        {busy ? "…" : t("makeAllSellers")}
      </button>
      {promotedCount !== null && (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {t("makeAllSellersDone", { count: promotedCount })}
        </span>
      )}
      {error && (
        <span className="text-sm text-red-600">{t("makeAllSellersError")}</span>
      )}
    </div>
  );
}
