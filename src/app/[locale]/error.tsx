"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { logClientEvent } from "@/lib/clientLog";
import { maybeReloadForChunkError } from "@/lib/chunkReload";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // A stale-deploy chunk failure can surface here too — reload to recover
    // before showing the error screen.
    if (maybeReloadForChunkError(error)) return;
    console.error(error);
    // Report the boundary hit so a user landing on the error screen leaves a trace.
    logClientEvent({
      event: "client_error",
      level: "ERROR",
      outcome: "react_error_boundary",
      message: error.message,
      meta: { digest: error.digest, stack: error.stack?.slice(0, 2000) },
    });
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
