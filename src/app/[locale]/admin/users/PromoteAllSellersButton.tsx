"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PromoteAllSellersButton() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promotedCount, setPromotedCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  async function handleConfirm() {
    setShowModal(false);
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
    <>
      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          onClick={() => setShowModal(true)}
          className="btn-danger text-sm"
        >
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t("makeAllSellersDialogTitle")}
              </h2>
            </div>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              {t("makeAllSellersConfirm")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary text-sm"
              >
                {t("makeAllSellersCancel")}
              </button>
              <button
                onClick={handleConfirm}
                className="btn-danger text-sm"
              >
                {t("makeAllSellers")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
