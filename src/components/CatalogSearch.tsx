"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Catalog search box with a live (debounced) query and a clear affordance.
 *
 * The previous version was a bare <input> inside a GET form: you had to press
 * Enter to search and there was no way to clear an active query without manually
 * selecting and deleting the text. This keeps the form's no-JS fallback (Enter
 * still submits) while adding debounced navigation as you type and an inline ✕
 * button that resets the query.
 */
export default function CatalogSearch({
  locale,
  type,
  initialQuery,
}: {
  locale: string;
  type?: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const t = useTranslations("filter");
  const [value, setValue] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track the query currently reflected in the URL so debounced typing doesn't
  // push a redundant navigation (which would also fight a server re-render).
  const committedRef = useRef(initialQuery);

  // Keep local state in sync when the URL changes from elsewhere (filter pills,
  // back/forward navigation).
  useEffect(() => {
    setValue(initialQuery);
    committedRef.current = initialQuery;
  }, [initialQuery]);

  function navigate(query: string) {
    const trimmed = query.trim();
    if (trimmed === committedRef.current.trim()) return;
    committedRef.current = trimmed;
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (trimmed) params.set("q", trimmed);
    const qs = params.toString();
    router.push(qs ? `/${locale}?${qs}` : `/${locale}`);
  }

  // Debounce live search while typing.
  useEffect(() => {
    const id = setTimeout(() => navigate(value), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function clear() {
    setValue("");
    navigate("");
    inputRef.current?.focus();
  }

  return (
    <form
      action={`/${locale}`}
      onSubmit={(e) => {
        e.preventDefault();
        navigate(value);
      }}
      role="search"
    >
      {type ? <input type="hidden" name="type" value={type} /> : null}
      <label htmlFor="catalog-search" className="sr-only">
        {t("searchPlaceholder")}
      </label>
      <div className="relative">
        <input
          id="catalog-search"
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="field pe-10"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label={t("clearSearch")}
            title={t("clearSearch")}
            className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
