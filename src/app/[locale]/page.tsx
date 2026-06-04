import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ItemCard from "@/components/ItemCard";
import CatalogSearch from "@/components/CatalogSearch";
import EmptyState from "@/components/EmptyState";
import DuplicateSiteCTA from "@/components/DuplicateSiteCTA";
import { getOptionalUser } from "@/lib/guards";
import type { Locale } from "@/i18n/config";

type SearchParams = Promise<{ type?: string; q?: string }>;

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type, q: rawQ } = await searchParams;
  const q = rawQ?.trim().slice(0, 100) || undefined;
  const t = await getTranslations();

  const user = await getOptionalUser();

  const items = await prisma.item.findMany({
    where: {
      status: "AVAILABLE",
      ...(type === "SELL" || type === "GIVE" ? { type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    // Project only the columns ItemCard renders. Avoids hauling the (potentially
    // large) `description` free-text and other unused columns across 60 rows.
    select: {
      id: true,
      title: true,
      type: true,
      priceIls: true,
      previousPriceIls: true,
      giveIfUnsold: true,
      condition: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      owner: { select: { name: true, whatsappPhone: true, city: true } },
      _count: { select: { images: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const likedIds = user
    ? new Set(
        (
          await prisma.itemLike.findMany({
            where: { userId: user.id, itemId: { in: items.map((i) => i.id) } },
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{t("app.title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("app.tagline")}</p>
        </div>
        <Link
          href={`/${locale}/my/items/new`}
          className="btn-primary hidden whitespace-nowrap sm:inline-flex"
        >
          + {t("nav.newItem")}
        </Link>
      </div>

      {/* Search + filter bar. Sticky on desktop only; on mobile it just scrolls
          normally so iOS Safari's address-bar shenanigans don't pull it around. */}
      <div className="flex flex-col gap-2 md:sticky md:top-14 md:z-20 md:bg-slate-50/95 md:py-2 md:backdrop-blur md:dark:bg-slate-950/95">
        <CatalogSearch
          locale={locale}
          type={type === "SELL" || type === "GIVE" ? type : undefined}
          initialQuery={q ?? ""}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterOptions.map((opt) => {
            const active = (type ?? "") === opt.key;
            const href = `/${locale}?${new URLSearchParams({
              ...(opt.key ? { type: opt.key } : {}),
              ...(q ? { q } : {}),
            }).toString()}`;
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
      </div>

      {q && (
        <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
          {t("filter.resultsForQuery", { count: items.length, query: q })}
        </p>
      )}

      {items.length === 0 ? (
        // A search or type filter is active: there ARE listings, this query just
        // didn't match any. Offer to clear the filters rather than (misleadingly)
        // inviting the user to "be the first to post".
        q || type === "SELL" || type === "GIVE" ? (
          <EmptyState
            emoji="🔍"
            title={t("filter.noResultsTitle")}
            description={t("filter.noResultsHint")}
            cta={{ href: `/${locale}`, label: t("filter.clearFilters") }}
          />
        ) : (
          <EmptyState
            emoji="📦"
            title={t("item.noItems")}
            description={t("item.noItemsHint")}
            cta={user ? { href: `/${locale}/my/items/new`, label: t("nav.newItem") } : undefined}
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              locale={locale}
              liked={likedIds.has(item.id)}
              isLoggedIn={!!user}
              item={{
                id: item.id,
                title: item.title,
                type: item.type as "SELL" | "GIVE",
                priceIls: item.priceIls,
                previousPriceIls: item.previousPriceIls,
                giveIfUnsold: item.giveIfUnsold,
                condition: item.condition,
                images: item.images,
                imageCount: item._count.images,
                // The number never reaches the client — contact goes through the
                // server-side redirect. Cards only need to know a number exists.
                owner: {
                  name: item.owner.name,
                  city: item.owner.city,
                  hasPhone: !!user && !!item.owner.whatsappPhone,
                },
              }}
            />
          ))}
        </div>
      )}

      <DuplicateSiteCTA defaultName={user?.name} defaultEmail={user?.email} />
    </div>
  );
}
