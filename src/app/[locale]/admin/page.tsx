import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { bucketByDay } from "@/lib/analytics";
import TrendBars from "@/components/charts/TrendBars";
import CategoryBars from "@/components/charts/CategoryBars";
import type { Locale } from "@/i18n/config";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    newUsers30,
    itemCount,
    newItems30,
    statusRows,
    typeRows,
    reducedCount,
    viewsAgg,
    loggedViewCount,
    likeCount,
    signupCount,
    potentialAgg,
    soldAgg,
    viewsLog,
    itemsLog,
    recentViews,
    topItems,
    totalVisits,
    uniqueVisitorRows,
    totalContactClicks,
    visitsLog,
    clicksLog,
    topClickedItems,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.item.count(),
    prisma.item.count({ where: { createdAt: { gte: since30 } } }),
    prisma.item.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.item.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.item.count({ where: { previousPriceIls: { not: null } } }),
    prisma.item.aggregate({ _sum: { viewCount: true } }),
    prisma.itemView.count(),
    prisma.itemLike.count(),
    prisma.giveIfUnsoldSignup.count(),
    prisma.item.aggregate({ _sum: { priceIls: true }, where: { type: "SELL", status: "AVAILABLE" } }),
    prisma.item.aggregate({ _sum: { priceIls: true }, where: { type: "SELL", status: "SOLD" } }),
    // Timestamps for the 30-day trend charts (bounded so a busy site can't blow up memory).
    prisma.itemView.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.item.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    // Latest "who viewed what" entries for the activity feed.
    prisma.itemView.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        item: { select: { id: true, title: true } },
      },
    }),
    prisma.item.findMany({
      where: { viewCount: { gt: 0 } },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { id: true, title: true, viewCount: true },
    }),
    // Visit + click analytics
    prisma.visit.count(),
    prisma.visit.groupBy({ by: ["visitorId"] }),
    prisma.itemClick.count(),
    prisma.visit.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.itemClick.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true }, take: 10000 }),
    prisma.item.findMany({
      where: { clickCount: { gt: 0 } },
      orderBy: { clickCount: "desc" },
      take: 5,
      select: { id: true, title: true, clickCount: true, viewCount: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r._count._all;
  const byType: Record<string, number> = {};
  for (const r of typeRows) byType[r.type] = r._count._all;

  const viewsTrend = bucketByDay(viewsLog.map((v) => v.createdAt), 30, now, locale);
  const itemsTrend = bucketByDay(itemsLog.map((v) => v.createdAt), 30, now, locale);
  const visitsTrend = bucketByDay(visitsLog.map((v) => v.createdAt), 30, now, locale);
  const clicksTrend = bucketByDay(clicksLog.map((v) => v.createdAt), 30, now, locale);

  const uniqueVisitorCount = uniqueVisitorRows.length;

  const num = (n: number) => n.toLocaleString(locale);
  const ils = (n: number) => `₪${n.toLocaleString(locale)}`;
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const kpis: { label: string; value: string }[] = [
    { label: t("metrics.users"), value: num(userCount) },
    { label: t("metrics.newUsers30"), value: num(newUsers30) },
    { label: t("metrics.items"), value: num(itemCount) },
    { label: t("metrics.newItems30"), value: num(newItems30) },
    { label: t("metrics.loggedViews"), value: num(loggedViewCount) },
    { label: t("metrics.totalViews"), value: num(viewsAgg._sum.viewCount ?? 0) },
    { label: t("metrics.totalLikes"), value: num(likeCount) },
    { label: t("metrics.signups"), value: num(signupCount) },
    { label: t("metrics.reducedItems"), value: num(reducedCount) },
    { label: t("metrics.potentialRevenue"), value: ils(potentialAgg._sum.priceIls ?? 0) },
    { label: t("metrics.realizedRevenue"), value: ils(soldAgg._sum.priceIls ?? 0) },
    { label: t("metrics.totalVisits"), value: num(totalVisits) },
    { label: t("metrics.uniqueVisitors"), value: num(uniqueVisitorCount) },
    { label: t("metrics.contactClicks"), value: num(totalContactClicks) },
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
      <h1 className="text-2xl font-bold">{t("metrics.title")}</h1>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{kpi.value}</div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Trend charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("charts.viewsTrend")}>
          <TrendBars data={viewsTrend} accentClass="bg-indigo-500" ariaLabel={t("charts.viewsTrend")} />
        </Panel>
        <Panel title={t("charts.listingsTrend")}>
          <TrendBars data={itemsTrend} accentClass="bg-emerald-500" ariaLabel={t("charts.listingsTrend")} />
        </Panel>
      </div>

      {/* Visits + clicks trend charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("charts.visitsTrend")}>
          <TrendBars data={visitsTrend} accentClass="bg-violet-500" ariaLabel={t("charts.visitsTrend")} />
        </Panel>
        <Panel title={t("charts.clicksTrend")}>
          <TrendBars data={clicksTrend} accentClass="bg-rose-500" ariaLabel={t("charts.clicksTrend")} />
        </Panel>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("charts.itemsByStatus")}>
          <CategoryBars data={statusBars} />
        </Panel>
        <Panel title={t("charts.itemsByType")}>
          <CategoryBars data={typeBars} />
        </Panel>
      </div>

      {/* Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t("activity.recentViews")}
          action={
            <Link href={`/${locale}/admin/views`} className="text-xs font-medium text-brand hover:underline">
              {t("activity.viewAll")}
            </Link>
          }
        >
          {recentViews.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("activity.none")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {recentViews.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {v.user.name || v.user.email}
                    </span>
                    <span className="text-slate-400"> → </span>
                    <Link
                      href={`/${locale}/items/${v.item.id}`}
                      className="truncate text-slate-600 hover:underline dark:text-slate-300"
                    >
                      {v.item.title}
                    </Link>
                  </span>
                  <time className="shrink-0 text-xs text-slate-400" dateTime={v.createdAt.toISOString()}>
                    {dtf.format(v.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("activity.mostViewed")}>
          {topItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("activity.none")}</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {topItems.map((item, i) => (
                <li key={item.id} className="flex items-center gap-3 py-1">
                  <span className="w-5 shrink-0 text-end font-semibold tabular-nums text-slate-400">{i + 1}</span>
                  <Link
                    href={`/${locale}/items/${item.id}`}
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
      </div>

      {/* Most clicked items */}
      <Panel
        title={t("activity.mostClicked")}
        action={
          <Link href={`/${locale}/admin/clicks`} className="text-xs font-medium text-brand hover:underline">
            {t("activity.viewAll")}
          </Link>
        }
      >
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
                    href={`/${locale}/items/${item.id}`}
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
