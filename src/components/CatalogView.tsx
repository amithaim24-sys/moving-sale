import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ItemCard from "@/components/ItemCard";
import CatalogSearch from "@/components/CatalogSearch";
import EmptyState from "@/components/EmptyState";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/types";
import type { Locale } from "@/i18n/config";

type Viewer = { id: string; name?: string | null } | null;

// Shape stored in the Vercel Data Cache. Note: we deliberately reduce the
// owner's phone to a boolean (`hasPhone`) before caching so no PII (the actual
// WhatsApp number) is ever written to the cache. Whether the number is shown
// is decided per-request from the viewer's auth state.
type CachedCatalogItem = {
  id: string;
  title: string;
  type: string;
  priceIls: number | null;
  previousPriceIls: number | null;
  giveIfUnsold: boolean;
  condition: string | null;
  images: { url: string }[];
  imageCount: number;
  owner: { name: string | null; city: string | null; hasPhone: boolean };
};

const CATALOG_ITEM_SELECT = {
  id: true,
  title: true,
  type: true,
  priceIls: true,
  previousPriceIls: true,
  giveIfUnsold: true,
  condition: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
  owner: { select: { name: true, whatsappPhone: true, city: true } },
  _count: { select: { images: true } },
} as const;

type CatalogWhere = {
  storeId: string | null;
  status: "AVAILABLE";
  type?: "SELL" | "GIVE";
  category?: ItemCategory;
};

// Runs the actual listing query and strips the phone number down to a boolean.
async function runCatalogQuery(where: CatalogWhere): Promise<CachedCatalogItem[]> {
  const rows = await prisma.item.findMany({
    where,
    select: CATALOG_ITEM_SELECT,
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return rows.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    priceIls: item.priceIls,
    previousPriceIls: item.previousPriceIls,
    giveIfUnsold: item.giveIfUnsold,
    condition: item.condition,
    images: item.images,
    imageCount: item._count.images,
    owner: { name: item.owner.name, city: item.owner.city, hasPhone: !!item.owner.whatsappPhone },
  }));
}

// Cached catalog read for the common, non-personalized, non-search views. The
// item rows are identical for every viewer given the same filters, so they're a
// perfect Data Cache fit. 60s time-based revalidation bounds staleness for any
// mutation we don't explicitly invalidate; the "catalog" tags let item
// create/update invalidate immediately. Free-text search bypasses this.
const getCachedCatalog = (storeId: string | null, type?: "SELL" | "GIVE", category?: ItemCategory) =>
  unstable_cache(
    () => runCatalogQuery({ storeId, status: "AVAILABLE", ...(type ? { type } : {}), ...(category ? { category } : {}) }),
    ["catalog-items", storeId ?? "root", type ?? "all", category ?? "all"],
    { revalidate: 60, tags: ["catalog", `catalog:${storeId ?? "root"}`] },
  )();

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

  // Free-text search bypasses the Data Cache: queries are unbounded (one cache
  // entry per phrase) and rarely repeated, so caching them only bloats storage.
  // The common no-search views (all / by type / by category) are served from
  // the cache.
  const items: CachedCatalogItem[] = q
    ? (
        await prisma.item.findMany({
          where: {
            storeId,
            status: "AVAILABLE",
            ...(typeFilter ? { type: typeFilter } : {}),
            ...(category ? { category } : {}),
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          select: CATALOG_ITEM_SELECT,
          orderBy: { createdAt: "desc" },
          take: 60,
        })
      ).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        priceIls: item.priceIls,
        previousPriceIls: item.previousPriceIls,
        giveIfUnsold: item.giveIfUnsold,
        condition: item.condition,
        images: item.images,
        imageCount: item._count.images,
        owner: { name: item.owner.name, city: item.owner.city, hasPhone: !!item.owner.whatsappPhone },
      }))
    : await getCachedCatalog(storeId, typeFilter, category);

  // Categories that actually have available listings in THIS catalog.
  const presentCategories = new Set(await getCachedCategories(storeId));
  const categoryChips = ITEM_CATEGORIES.filter(
    (c) => presentCategories.has(c) || c === category,
  );

  const likedIds = viewer
    ? new Set(
        (
          await prisma.itemLike.findMany({
            where: { userId: viewer.id, itemId: { in: items.map((i) => i.id) } },
            select: { itemId: true },
          })
        ).map((l) => l.itemId),
      )
    : new Set<string>();

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              locale={locale}
              basePath={basePath}
              liked={likedIds.has(item.id)}
              isLoggedIn={!!viewer}
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
                  hasPhone: !!viewer && item.owner.hasPhone,
                },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
