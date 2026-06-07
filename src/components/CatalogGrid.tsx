"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ItemCard from "@/components/ItemCard";
import type { CachedCatalogItem } from "@/lib/catalog";

// Client-side catalog grid with infinite scroll. The first page is rendered on
// the server (good for SSR/LCP and cover-image priority); this component appends
// further pages from /api/catalog as the sentinel scrolls into view.
//
// The component is remounted whenever the active filters change because the page
// re-keys the surrounding <Suspense> on type/category/search — so state here
// always starts from a fresh first page that matches the current filters.
export default function CatalogGrid({
  locale,
  basePath,
  isLoggedIn,
  storeId,
  filters,
  initialItems,
  initialLikedIds,
  initialHasMore,
}: {
  locale: string;
  basePath: string;
  isLoggedIn: boolean;
  storeId: string | null;
  filters: { type?: "SELL" | "GIVE"; category?: string; q?: string };
  initialItems: CachedCatalogItem[];
  initialLikedIds: string[];
  initialHasMore: boolean;
}) {
  const t = useTranslations();
  const [items, setItems] = useState(initialItems);
  const [liked, setLiked] = useState(() => new Set(initialLikedIds));
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState(false);

  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setError(false);
    const next = page + 1;
    try {
      const params = new URLSearchParams();
      if (storeId) params.set("storeId", storeId);
      if (filters.type) params.set("type", filters.type);
      if (filters.category) params.set("category", filters.category);
      if (filters.q) params.set("q", filters.q);
      params.set("page", String(next));

      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`catalog page ${next} failed`);
      const data: { items: CachedCatalogItem[]; likedIds: string[]; hasMore: boolean } = await res.json();

      setItems((prev) => {
        // Offset pagination can shift if a new item lands mid-scroll; dedupe by id.
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !seen.has(i.id))];
      });
      setLiked((prev) => {
        const merged = new Set(prev);
        for (const id of data.likedIds) merged.add(id);
        return merged;
      });
      setHasMore(Boolean(data.hasMore));
      setPage(next);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
    }
  }, [page, hasMore, storeId, filters.type, filters.category, filters.q]);

  // Auto-load the next page when the sentinel nears the viewport. Paused while an
  // error is showing so the user can retry deliberately instead of hammering.
  useEffect(() => {
    if (!hasMore || error) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, error, loadMore]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            locale={locale}
            basePath={basePath}
            liked={liked.has(item.id)}
            isLoggedIn={isLoggedIn}
            // Prioritize the first row (up to 4 columns on desktop) so the
            // catalog's largest visible image isn't lazy-loaded.
            priority={index < 4}
            item={{
              id: item.id,
              title: item.title,
              type: item.type as "SELL" | "GIVE",
              priceIls: item.priceIls,
              previousPriceIls: item.previousPriceIls,
              giveIfUnsold: item.giveIfUnsold,
              condition: item.condition,
              images: item.images,
              imageCount: item.imageCount,
              owner: {
                name: item.owner.name,
                city: item.owner.city,
                hasPhone: isLoggedIn && item.owner.hasPhone,
              },
            }}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {error ? (
            <button
              type="button"
              onClick={loadMore}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("error.retry")}
            </button>
          ) : (
            <span
              className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand"
              role="status"
              aria-label={t("a11y.loading")}
            />
          )}
        </div>
      )}
    </div>
  );
}
