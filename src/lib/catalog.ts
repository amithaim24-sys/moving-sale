import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ItemCategory } from "@/lib/types";

// How many items a single catalog page/batch contains. The catalog uses
// offset pagination (infinite scroll appends one page at a time).
export const CATALOG_PAGE_SIZE = 60;

// Shape stored in the Vercel Data Cache. Note: we deliberately reduce the
// owner's phone to a boolean (`hasPhone`) before caching so no PII (the actual
// WhatsApp number) is ever written to the cache. Whether the number is shown
// is decided per-request from the viewer's auth state.
export type CachedCatalogItem = {
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

export type CatalogFilters = {
  storeId: string | null;
  type?: "SELL" | "GIVE";
  category?: ItemCategory;
  q?: string;
};

type CatalogRow = {
  id: string;
  title: string;
  type: string;
  priceIls: number | null;
  previousPriceIls: number | null;
  giveIfUnsold: boolean;
  condition: string | null;
  images: { url: string }[];
  owner: { name: string | null; whatsappPhone: string | null; city: string | null };
  _count: { images: number };
};

function mapRow(item: CatalogRow): CachedCatalogItem {
  return {
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
  };
}

// Runs the actual listing query and strips the phone number down to a boolean.
async function queryCatalog(filters: CatalogFilters, skip: number, take: number): Promise<CachedCatalogItem[]> {
  const { storeId, type, category, q } = filters;
  const rows = await prisma.item.findMany({
    where: {
      storeId,
      status: "AVAILABLE",
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: CATALOG_ITEM_SELECT,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  return rows.map(mapRow);
}

// Cached catalog page for the common, non-personalized, non-search views. The
// item rows are identical for every viewer given the same filters + page, so
// they're a perfect Data Cache fit. 60s time-based revalidation bounds staleness
// for any mutation we don't explicitly invalidate; the "catalog" tags let item
// create/update invalidate immediately. Free-text search bypasses this.
const getCachedCatalogPage = (
  storeId: string | null,
  page: number,
  type?: "SELL" | "GIVE",
  category?: ItemCategory,
) =>
  unstable_cache(
    () => queryCatalog({ storeId, type, category }, page * CATALOG_PAGE_SIZE, CATALOG_PAGE_SIZE + 1),
    ["catalog-items", storeId ?? "root", type ?? "all", category ?? "all", `page-${page}`],
    { revalidate: 60, tags: ["catalog", `catalog:${storeId ?? "root"}`] },
  )();

// Fetch one page of the catalog. Returns up to CATALOG_PAGE_SIZE items plus a
// `hasMore` flag. We over-fetch by one row (take = SIZE + 1) so we can tell
// whether a next page exists without a second count query.
export async function fetchCatalogPage(
  filters: CatalogFilters,
  page: number,
): Promise<{ items: CachedCatalogItem[]; hasMore: boolean }> {
  const skip = page * CATALOG_PAGE_SIZE;
  const take = CATALOG_PAGE_SIZE + 1;

  // Free-text search bypasses the Data Cache: queries are unbounded (one cache
  // entry per phrase) and rarely repeated, so caching them only bloats storage.
  const rows = filters.q
    ? await queryCatalog(filters, skip, take)
    : await getCachedCatalogPage(filters.storeId, page, filters.type, filters.category);

  const hasMore = rows.length > CATALOG_PAGE_SIZE;
  return { items: hasMore ? rows.slice(0, CATALOG_PAGE_SIZE) : rows, hasMore };
}
