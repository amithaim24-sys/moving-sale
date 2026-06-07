import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import CatalogGrid from "@/components/CatalogGrid";
import CatalogSearch from "@/components/CatalogSearch";
import EmptyState from "@/components/EmptyState";
import { fetchCatalogPage } from "@/lib/catalog";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/types";
import type { Locale } from "@/i18n/config";

type Viewer = { id: string; name?: string | null } | null;

// Which categories have available listings in this store. Depends only on
// storeId (not the active filters), so it's cached per store.
const getCachedCategories = (storeId: string | null) =>
  unstable_cache(
    async () => {
      const rows = await prisma.item.groupBy({
        by: ["category"],
        where: { storeId, status: "AVAILABLE", category: { not: null } },
        _count: true,
      });
      return rows.map((r) => r.category).filter((c): c is string => c != null);
    },
    ["catalog-categories", storeId ?? "root"],
    { revalidate: 60, tags: ["catalog", `catalog:${storeId ?? "root"}`] },
  )();

// Shared catalog body used by both the root/primary catalog (storeId = null) and a
// white-label store catalog (storeId = the store's id). All listing queries are
// scoped by `storeId`, which is what keeps each store's items isolated from the
// others and from the root sale. `basePath` is the path filter links point back to
// (e.g. `/en` for root, `/en/s/dana` for a store).
export default async function CatalogView({
  locale,
  storeId,
  basePath,
  searchParams,
  viewer,
  newItemHref,
}: {
  locale: Locale;
  storeId: string | null;
  basePath: string;
  searchParams: { type?: string; q?: string; category?: string };
  viewer: Viewer;
  // When set, a "+ New item" button is shown (root: any signed-in user; store: the owner).
  newItemHref?: string;
}) {
  const t = await getTranslations();
  const { type, q: rawQ, category: rawCategory } = searchParams;
  const q = rawQ?.trim().slice(0, 100) || undefined;
  const category = ITEM_CATEGORIES.includes(rawCategory as ItemCategory)
    ? (rawCategory as ItemCategory)
    : undefined;

  const typeFilter = type === "SELL" || type === "GIVE" ? type : undefined;

  // First page (server-rendered for SSR/LCP). Further pages are loaded by the
  // client grid from /api/catalog. The shared fetcher serves the common
  // no-search views from the Data Cache and bypasses it for free-text search.
  const { items, hasMore } = await fetchCatalogPage(
    { storeId, type: typeFilter, category, q },
    0,
  );

  // Categories that actually have available listings in THIS catalog.
  const presentCategories = new Set(await getCachedCategories(storeId));
  const categoryChips = ITEM_CATEGORIES.filter(
    (c) => presentCategories.has(c) || c === category,
  );

  const likedIds = viewer
    ? (
        await prisma.itemLike.findMany({
          where: { userId: viewer.id, itemId: { in: items.map((i) => i.id) } },
          select: { itemId: true },
        })
      ).map((l) => l.itemId)
    : [];

  const filterOptions = [
    { key: "", label: t("filter.all") },
    { key: "SELL", label: t("filter.sell") },
    { key: "GIVE", label: t("filter.give") },
  ];

  const buildHref = (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>,
    ).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="space-y-4">
      {newItemHref && (
        <div className="flex justify-end">
          <Link href={newItemHref} className="btn-primary hidden whitespace-nowrap sm:inline-flex">
            + {t("nav.newItem")}
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2 md:sticky md:top-14 md:z-20 md:bg-slate-50/95 md:py-2 md:backdrop-blur md:dark:bg-slate-950/95">
        <CatalogSearch
          locale={locale}
          type={type === "SELL" || type === "GIVE" ? type : undefined}
          category={category}
          initialQuery={q ?? ""}
          basePath={basePath}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterOptions.map((opt) => {
            const active = (type ?? "") === opt.key;
            const href = buildHref({ type: opt.key || undefined, category, q });
            return (
              <a
                key={opt.key}
                href={href}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </a>
            );
          })}
        </div>
        {categoryChips.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {[{ key: "", label: t("filter.all") }, ...categoryChips.map((c) => ({ key: c, label: t(`item.category.${c}`) }))].map(
              (opt) => {
                const active = (category ?? "") === opt.key;
                const href = buildHref({
                  type: type === "SELL" || type === "GIVE" ? type : undefined,
                  category: opt.key || undefined,
                  q,
                });
                return (
                  <a
                    key={opt.key || "all"}
                    href={href}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-brand bg-brand/10 text-brand dark:bg-brand/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </a>
                );
              },
            )}
          </div>
        )}
      </div>

      {q && (
        <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
          {t("filter.resultsForQuery", { count: items.length, query: q })}
        </p>
      )}

      {items.length === 0 ? (
        q || category || type === "SELL" || type === "GIVE" ? (
          <EmptyState
            emoji="🔍"
            title={t("filter.noResultsTitle")}
            description={t("filter.noResultsHint")}
            cta={{ href: basePath, label: t("filter.clearFilters") }}
          />
        ) : (
          <EmptyState
            emoji="📦"
            title={t("item.noItems")}
            description={t("item.noItemsHint")}
            cta={newItemHref ? { href: newItemHref, label: t("nav.newItem") } : undefined}
          />
        )
      ) : (
        <CatalogGrid
          locale={locale}
          basePath={basePath}
          isLoggedIn={!!viewer}
          storeId={storeId}
          filters={{ type: typeFilter, category, q }}
          initialItems={items}
          initialLikedIds={likedIds}
          initialHasMore={hasMore}
        />
      )}
    </div>
  );
}
