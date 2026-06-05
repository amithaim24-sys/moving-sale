"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import WebsiteRequestForm from "@/components/WebsiteRequestForm";

// Header "Want a website like this?" pill. Opens a modal with the lead form so a
// visitor can request their own copy of the site from any page; submissions land
// in the admin "Website requests" panel.
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

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label={a11y("closeDialog")}
              className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
            <h2 id={titleId} className="pe-8 text-lg font-bold sm:text-xl">
              {t("heading")}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("subheading")}</p>
            <div className="mt-4">
              <WebsiteRequestForm defaultName={defaultName} defaultEmail={defaultEmail} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
