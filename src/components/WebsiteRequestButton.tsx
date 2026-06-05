"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import WebsiteRequestForm from "@/components/WebsiteRequestForm";

// Header "Want a website like this?" pill. Opens a slide-in sidebar with the lead
// form so a visitor can request their own copy of the site from any page;
// submissions land in the admin "Website requests" panel.
export default function WebsiteRequestButton({
  defaultName,
  defaultEmail,
}: {
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const t = useTranslations("duplicate");
  const tApp = useTranslations("app");
  const a11y = useTranslations("a11y");
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="me-1 inline-flex items-center whitespace-nowrap rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20"
      >
        <span className="hidden sm:inline">{tApp("wantWebsite")}</span>
        <span className="sm:hidden">{tApp("wantWebsiteShort")}</span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[80] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Slide-in sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed end-0 top-0 z-[90] flex h-full w-96 max-w-[90vw] flex-col bg-white shadow-xl transition-transform dark:bg-slate-900 ${
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {t("heading")}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("subheading")}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label={a11y("closeDialog")}
            className="-me-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {open && <WebsiteRequestForm defaultName={defaultName} defaultEmail={defaultEmail} />}
        </div>
      </aside>
    </>
  );
}
