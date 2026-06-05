"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import WebsiteRequestForm from "@/components/WebsiteRequestForm";

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
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-8 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 p-6 text-center ring-1 ring-brand/20 dark:from-brand/20 dark:to-brand/10">
      <h2 className="text-lg font-bold sm:text-xl">{t("heading")}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {t("subheading")}
      </p>

      {open ? (
        <div className="mx-auto mt-4 max-w-md">
          <WebsiteRequestForm defaultName={defaultName} defaultEmail={defaultEmail} />
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-primary mt-4">
          {t("cta")}
        </button>
      )}
    </section>
  );
}
