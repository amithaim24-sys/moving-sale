import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/types";
import type { Locale } from "@/i18n/config";

// Websites overview — the admin landing page. Instead of one combined total across
// every site, it shows a SEPARATE card per website (the main marketplace + each
// white-label store), each with that site's own numbers and a link to its full
// analytics. Nothing is summed across websites. Store cards are owner-only (a
// delegated admin sees only the main site).
export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const user = await requireAdmin();
  const owner = isOwner(user.role);

  const [stores, itemAgg, statusAgg, revenueAgg, visitAgg, uniqueAgg] = await Promise.all([
    owner
      ? prisma.store.findMany({
          orderBy: { createdAt: "desc" },
          select: { id: true, slug: true, name: true, active: true },
        })
      : Promise.resolve([] as { id: string; slug: string; name: string; active: boolean }[]),
    // Per-website engagement + item totals, all in grouped passes (no per-store queries).
    prisma.item.groupBy({ by: ["storeId"], _sum: { viewCount: true, clickCount: true }, _count: { _all: true } }),
    prisma.item.groupBy({ by: ["storeId", "status"], _count: { _all: true } }),
    prisma.item.groupBy({ by: ["storeId", "status"], where: { type: "SELL" }, _sum: { priceIls: true } }),
    prisma.visit.groupBy({ by: ["storeId"], _count: { _all: true } }),
    // Unique visitors per store via a pushed-down COUNT(DISTINCT) — one row per
    // store, instead of grouping the whole Visit table by (storeId, visitorId) and
    // counting rows in JS (which materialized one row per distinct visitor).
    prisma.$queryRaw<{ storeId: string | null; count: bigint }[]>(
      Prisma.sql`SELECT "storeId", COUNT(DISTINCT "visitorId") AS count FROM "Visit" GROUP BY "storeId"`,
    ),
  ]);

  // Index every aggregate by storeId (null key = the main/root site).
  type Key = string | null;
  const engagement = new Map<Key, { views: number; clicks: number; items: number }>();
  for (const r of itemAgg) {
    engagement.set(r.storeId, {
      views: r._sum.viewCount ?? 0,
      clicks: r._sum.clickCount ?? 0,
      items: r._count._all,
    });
  }
  const statusByStore = new Map<Key, Record<string, number>>();
  for (const r of statusAgg) {
    const m = statusByStore.get(r.storeId) ?? {};
    m[r.status] = r._count._all;
    statusByStore.set(r.storeId, m);
  }
  const revenueByStore = new Map<Key, { potential: number; realized: number }>();
  for (const r of revenueAgg) {
    const cur = revenueByStore.get(r.storeId) ?? { potential: 0, realized: 0 };
    const sum = r._sum.priceIls ?? 0;
    if (r.status === "SOLD") cur.realized += sum;
    else cur.potential += sum;
    revenueByStore.set(r.storeId, cur);
  }
  const visitsByStore = new Map<Key, number>();
  for (const r of visitAgg) visitsByStore.set(r.storeId, r._count._all);
  const uniqueByStore = new Map<Key, number>();
  for (const r of uniqueAgg) uniqueByStore.set(r.storeId, Number(r.count));

  const num = (n: number) => n.toLocaleString(locale);
  const ils = (n: number) => `₪${n.toLocaleString(locale)}`;

  function statsFor(key: Key) {
    const eng = engagement.get(key);
    const status = statusByStore.get(key) ?? {};
    const rev = revenueByStore.get(key) ?? { potential: 0, realized: 0 };
    return {
      visits: visitsByStore.get(key) ?? 0,
      unique: uniqueByStore.get(key) ?? 0,
      views: eng?.views ?? 0,
      clicks: eng?.clicks ?? 0,
      items: eng?.items ?? 0,
      available: status.AVAILABLE ?? 0,
      sold: status.SOLD ?? 0,
      potential: rev.potential,
      realized: rev.realized,
    };
  }

  // The main site first, then each white-label store (owner only).
  const sites = [
    {
      key: null as Key,
      name: t("overview.mainSite"),
      href: `/${locale}/admin/main`,
      active: null as boolean | null,
      stats: statsFor(null),
    },
    ...stores.map((s) => ({
      key: s.id as Key,
      name: s.name,
      href: `/${locale}/admin/stores/${s.id}`,
      active: s.active as boolean | null,
      stats: statsFor(s.id),
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("overview.title")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("overview.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sites.map((site) => {
          const s = site.stats;
          const cells = [
            { label: t("metrics.totalVisits"), value: num(s.visits) },
            { label: t("metrics.uniqueVisitors"), value: num(s.unique) },
            { label: t("metrics.totalViews"), value: num(s.views) },
            { label: t("metrics.contactClicks"), value: num(s.clicks) },
            { label: t("metrics.items"), value: num(s.items) },
            { label: t("metrics.sold"), value: num(s.sold) },
          ];
          return (
            <section
              key={site.key ?? "__main__"}
              className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                  <span className="truncate">{site.name}</span>
                  {site.active !== null && (
                    <span
                      className={
                        site.active
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }
                    >
                      {site.active ? t("stores.active") : t("stores.inactive")}
                    </span>
                  )}
                </h2>
                <Link href={site.href} className="shrink-0 text-xs font-medium text-brand hover:underline">
                  {t("overview.viewAnalytics")} →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {cells.map((c) => (
                  <div key={c.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{c.value}</div>
                    <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("metrics.potentialRevenue")}{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{ils(s.potential)}</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {t("metrics.realizedRevenue")}{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{ils(s.realized)}</span>
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
