import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/url";
import { TIME_ZONE } from "@/lib/analytics";
import CreateStoreForm from "./CreateStoreForm";
import StoreRow from "./StoreRow";
import type { Locale } from "@/i18n/config";

export default async function AdminStoresPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireOwner();

  const [stores, itemAgg, visitAgg, origin] = await Promise.all([
    prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        active: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    // Per-store engagement totals in one pass: views/clicks summed from the item
    // counters, grouped by store. (A null storeId group = the root catalog; ignored.)
    prisma.item.groupBy({ by: ["storeId"], _sum: { viewCount: true, clickCount: true } }),
    // Per-store traffic: visit rows carry their own storeId.
    prisma.visit.groupBy({ by: ["storeId"], _count: { _all: true } }),
    absoluteUrl(""),
  ]);

  // Index the aggregates by storeId so each row can read its own numbers.
  const viewsByStore = new Map<string, number>();
  const clicksByStore = new Map<string, number>();
  for (const r of itemAgg) {
    if (!r.storeId) continue;
    viewsByStore.set(r.storeId, r._sum.viewCount ?? 0);
    clicksByStore.set(r.storeId, r._sum.clickCount ?? 0);
  }
  const visitsByStore = new Map<string, number>();
  for (const r of visitAgg) {
    if (!r.storeId) continue;
    visitsByStore.set(r.storeId, r._count._all);
  }

  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: TIME_ZONE });

  const labels = {
    open: t("stores.open"),
    copyLink: t("stores.copyLink"),
    copied: t("stores.copied"),
    activate: t("stores.activate"),
    deactivate: t("stores.deactivate"),
    active: t("stores.active"),
    inactive: t("stores.inactive"),
    delete: t("stores.delete"),
    confirmDelete: t("stores.confirmDelete"),
    items: t("stores.itemsCount"),
    actionFailed: t("stores.actionFailed"),
    analytics: t("stores.analytics"),
    statVisits: t("stores.statVisits"),
    statViews: t("stores.statViews"),
    statClicks: t("stores.statClicks"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("stores.title")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("stores.intro")}</p>
      </div>

      <CreateStoreForm locale={locale} />

      {stores.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("stores.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {stores.map((s) => (
            <StoreRow
              key={s.id}
              locale={locale}
              store={{
                id: s.id,
                slug: s.slug,
                name: s.name,
                tagline: s.tagline,
                active: s.active,
                itemCount: s._count.items,
                visits: visitsByStore.get(s.id) ?? 0,
                views: viewsByStore.get(s.id) ?? 0,
                clicks: clicksByStore.get(s.id) ?? 0,
                ownerName: s.owner.name,
                ownerEmail: s.owner.email,
                createdLabel: dtf.format(s.createdAt),
                url: `${origin}/${locale}/s/${s.slug}`,
              }}
              labels={labels}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
