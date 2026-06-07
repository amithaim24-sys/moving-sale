import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { buildTrend, TIME_ZONE } from "@/lib/analytics";
import TrendChart from "@/components/charts/TrendChart";
import CategoryBars from "@/components/charts/CategoryBars";
import Funnel from "@/components/charts/Funnel";
import type { Locale } from "@/i18n/config";

// Per-website (per-store) analytics — the global super-admin's drill-down into a
// single white-label site they created. Owner-only; every number here is scoped to
// this store via `storeId` (visits/listings) or `item.storeId` (views/clicks), so
// the root catalog and other stores never leak in. Mirrors the global /admin
// dashboard, reusing the same chart components.
export default async function AdminStoreAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireOwner();

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      active: true,
      owner: { select: { name: true, email: true } },
    },
  });
  if (!store) notFound();

  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const itemWhere = { storeId: store.id };
  const clickWhere = { item: { storeId: store.id } };

  const [
    statusRows,
    typeRows,
    reducedCount,
    viewsAgg,
    loggedViewCount,
    likeCount,
    signupCount,
    memberCount,
    potentialAgg,
    soldAgg,
    totalVisits,
    uniqueVisitorRows,
    totalContactClicks,
    visitsLog,
    viewsLog,
    clicksLog,
    itemsLog,
    topItems,
    topClickedItems,
  ] = await Promise.all([
    prisma.item.groupBy({ by: ["status"], where: itemWhere, _count: { _all: true } }),
    prisma.item.groupBy({ by: ["type"], where: itemWhere, _count: { _all: true } }),
    prisma.item.count({ where: { ...itemWhere, previousPriceIls: { not: null } } }),
    prisma.item.aggregate({ where: itemWhere, _sum: { viewCount: true }, _count: { _all: true } }),
    prisma.itemView.count({ where: clickWhere }),
    prisma.itemLike.count({ where: clickWhere }),
    prisma.giveIfUnsoldSignup.count({ where: clickWhere }),
    prisma.storeMembership.count({ where: { storeId: store.id } }),
    prisma.item.aggregate({ _sum: { priceIls: true }, where: { ...itemWhere, type: "SELL", status: { not: "SOLD" } } }),
    prisma.item.aggregate({ _sum: { priceIls: true }, where: { ...itemWhere, type: "SELL", status: "SOLD" } }),
    prisma.visit.count({ where: { storeId: store.id } }),
    prisma.visit.groupBy({ by: ["visitorId"], where: { storeId: store.id } }),
    prisma.itemClick.count({ where: clickWhere }),
    // Timestamps for the 30-day trend charts (bounded so a busy site can't blow up memory).
    prisma.visit.findMany({ where: { storeId: store.id, createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.itemView.findMany({ where: { item: { storeId: store.id }, createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.itemClick.findMany({ where: { item: { storeId: store.id }, createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.item.findMany({ where: { storeId: store.id, createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.item.findMany({
      where: { ...itemWhere, viewCount: { gt: 0 } },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { id: true, title: true, viewCount: true },
    }),
    prisma.item.findMany({
      where: { ...itemWhere, clickCount: { gt: 0 } },
      orderBy: { clickCount: "desc" },
      take: 5,
      select: { id: true, title: true, clickCount: true, viewCount: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r._count._all;
  const byType: Record<string, number> = {};
  for (const r of typeRows) byType[r.type] = r._count._all;

  const visitsTrend = buildTrend(visitsLog.map((v) => v.createdAt), 30, now, locale);
  const viewsTrend = buildTrend(viewsLog.map((v) => v.createdAt), 30, now, locale);
  const clicksTrend = buildTrend(clicksLog.map((v) => v.createdAt), 30, now, locale);
  const itemsTrend = buildTrend(itemsLog.map((v) => v.createdAt), 30, now, locale);

  const uniqueVisitorCount = uniqueVisitorRows.length;
  const itemCount = viewsAgg._count._all;
  const totalViews = viewsAgg._sum.viewCount ?? 0;

  const num = (n: number) => n.toLocaleString(locale);
  const num1 = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });
  const ils = (n: number) => `₪${n.toLocaleString(locale)}`;

  const statsFor = (tr: ReturnType<typeof buildTrend>) => ({
    avg: t("charts.statAvg", { value: num1(tr.average) }),
    peak: tr.peak.value > 0 ? t("charts.statPeak", { value: num(tr.peak.value), date: tr.peak.label }) : "",
    deltaTitle: t("charts.deltaTitle", { days: Math.floor(tr.days / 2) }),
  });

  const kpiSections: { title: string; cards: { label: string; value: string }[] }[] = [
    {
      title: t("metrics.sectionItems"),
      cards: [
        { label: t("metrics.items"), value: num(itemCount) },
        { label: t("metrics.available"), value: num(byStatus.AVAILABLE ?? 0) },
        { label: t("metrics.sold"), value: num(byStatus.SOLD ?? 0) },
        { label: t("metrics.reducedItems"), value: num(reducedCount) },
      ],
    },
    {
      title: t("metrics.sectionEngagement"),
      cards: [
        { label: t("metrics.totalVisits"), value: num(totalVisits) },
        { label: t("metrics.uniqueVisitors"), value: num(uniqueVisitorCount) },
        { label: t("metrics.totalViews"), value: num(totalViews) },
        { label: t("metrics.loggedViews"), value: num(loggedViewCount) },
        { label: t("metrics.contactClicks"), value: num(totalContactClicks) },
        { label: t("metrics.totalLikes"), value: num(likeCount) },
        { label: t("metrics.signups"), value: num(signupCount) },
        { label: t("storeAnalytics.members"), value: num(memberCount) },
      ],
    },
    {
      title: t("metrics.sectionRevenue"),
      cards: [
        { label: t("metrics.potentialRevenue"), value: ils(potentialAgg._sum.priceIls ?? 0) },
        { label: t("metrics.realizedRevenue"), value: ils(soldAgg._sum.priceIls ?? 0) },
      ],
    },
  ];

  const pctOf = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : null);
  const funnelRows = [
    { label: t("metrics.totalVisits"), value: num(totalVisits), rawValue: totalVisits, rate: null, colorClass: "bg-violet-500" },
    { label: t("metrics.totalViews"), value: num(totalViews), rawValue: totalViews, rate: pctOf(totalViews, totalVisits), colorClass: "bg-indigo-500" },
    { label: t("metrics.contactClicks"), value: num(totalContactClicks), rawValue: totalContactClicks, rate: pctOf(totalContactClicks, totalViews), colorClass: "bg-rose-500" },
  ];

  const statusBars = [
    { label: t("metrics.available"), value: byStatus.AVAILABLE ?? 0, colorClass: "bg-emerald-500" },
    { label: t("metrics.reserved"), value: byStatus.RESERVED ?? 0, colorClass: "bg-amber-500" },
    { label: t("metrics.sold"), value: byStatus.SOLD ?? 0, colorClass: "bg-slate-400" },
    { label: t("metrics.hidden"), value: byStatus.HIDDEN ?? 0, colorClass: "bg-rose-500" },
    { label: t("metrics.draft"), value: byStatus.DRAFT ?? 0, colorClass: "bg-sky-500" },
  ];
  const typeBars = [
    { label: t("metrics.forSale"), value: byType.SELL ?? 0, colorClass: "bg-indigo-500" },
    { label: t("metrics.givingAway"), value: byType.GIVE ?? 0, colorClass: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href={`/${locale}/admin/stores`} className="text-xs font-medium text-brand hover:underline">
          {t("storeAnalytics.back")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <span className="truncate">{t("storeAnalytics.title", { name: store.name })}</span>
              <span
                className={
                  store.active
                    ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }
              >
                {store.active ? t("stores.active") : t("stores.inactive")}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("storeAnalytics.subtitle")}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("storeAnalytics.ownerLabel")}: {store.owner.name ? `${store.owner.name} · ` : ""}
              {store.owner.email}
            </p>
          </div>
          <a
            href={`/${locale}/s/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary shrink-0 text-xs"
          >
            {t("storeAnalytics.openStore")} ↗
          </a>
        </div>
      </div>

      {/* KPI strip, grouped by area */}
      <div className="space-y-5">
        {kpiSections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {section.cards.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
                >
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{kpi.value}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trend charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("charts.visitsTrend")}>
          <TrendChart trend={visitsTrend} color="#8b5cf6" locale={locale} stats={statsFor(visitsTrend)} />
        </Panel>
        <Panel title={t("charts.viewsTrend")}>
          <TrendChart trend={viewsTrend} color="#6366f1" locale={locale} stats={statsFor(viewsTrend)} />
        </Panel>
        <Panel title={t("charts.clicksTrend")}>
          <TrendChart trend={clicksTrend} color="#f43f5e" locale={locale} stats={statsFor(clicksTrend)} />
        </Panel>
        <Panel title={t("charts.listingsTrend")}>
          <TrendChart trend={itemsTrend} color="#10b981" locale={locale} stats={statsFor(itemsTrend)} />
        </Panel>
      </div>

      {/* Funnel + breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t("charts.funnelTitle")}>
          <Funnel rows={funnelRows} ofPreviousTitle={t("charts.ofPrevious")} />
        </Panel>
        <Panel title={t("charts.itemsByStatus")}>
          <CategoryBars data={statusBars} locale={locale} />
        </Panel>
        <Panel title={t("charts.itemsByType")}>
          <CategoryBars data={typeBars} locale={locale} />
        </Panel>
      </div>

      {/* Top items */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("activity.mostViewed")}>
          {topItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("storeAnalytics.noItems")}</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {topItems.map((item, i) => (
                <li key={item.id} className="flex items-center gap-3 py-1">
                  <span className="w-5 shrink-0 text-end font-semibold tabular-nums text-slate-400">{i + 1}</span>
                  <Link
                    href={`/${locale}/s/${store.slug}/items/${item.id}`}
                    className="min-w-0 flex-1 truncate text-slate-700 hover:underline dark:text-slate-200"
                  >
                    {item.title}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">👁 {num(item.viewCount)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("activity.mostClicked")}>
          {topClickedItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("activity.noneClicks")}</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {topClickedItems.map((item, i) => {
                const ctr = item.viewCount > 0 ? `${((item.clickCount / item.viewCount) * 100).toFixed(1)}%` : "—";
                return (
                  <li key={item.id} className="flex items-center gap-3 py-1">
                    <span className="w-5 shrink-0 text-end font-semibold tabular-nums text-slate-400">{i + 1}</span>
                    <Link
                      href={`/${locale}/s/${store.slug}/items/${item.id}`}
                      className="min-w-0 flex-1 truncate text-slate-700 hover:underline dark:text-slate-200"
                    >
                      {item.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">🖱 {num(item.clickCount)}</span>
                    <span className="shrink-0 text-xs font-medium text-slate-400">CTR {ctr}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

// Card shell for a chart or activity list, with an optional top-right action.
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
