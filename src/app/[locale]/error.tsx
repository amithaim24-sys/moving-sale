"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-6xl" aria-hidden="true">
        😵
      </div>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">{t("body")}</p>
      <button type="button" onClick={() => reset()} className="btn-primary">
        {t("retry")}
      </button>
    </div>
  );
}
