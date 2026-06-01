import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
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
    adminCount,
    bannedCount,
    newUsers30,
    itemCount,
    newItems30,
    statusRows,
    typeRows,
    reducedCount,
    viewsAgg,
    likeCount,
    signupCount,
    potentialAgg,
    soldAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.item.count(),
    prisma.item.count({ where: { createdAt: { gte: since30 } } }),
    prisma.item.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.item.groupBy({ by: ["type"], _count: { _all: true } }),
    // Items currently advertising a price cut (struck-through "was" price).
    prisma.item.count({ where: { previousPriceIls: { not: null } } }),
    prisma.item.aggregate({ _sum: { viewCount: true } }),
    prisma.itemLike.count(),
    prisma.giveIfUnsoldSignup.count(),
    prisma.item.aggregate({
      _sum: { priceIls: true },
      where: { type: "SELL", status: "AVAILABLE" },
    }),
    prisma.item.aggregate({
      _sum: { priceIls: true },
      where: { type: "SELL", status: "SOLD" },
    }),
  ]);

  // Roll the groupBy results into lookups so each card can read its bucket (0 if absent).
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r._count._all;
  const byType: Record<string, number> = {};
  for (const r of typeRows) byType[r.type] = r._count._all;

  const ils = (n: number) => `₪${n.toLocaleString(locale)}`;
  const num = (n: number) => n.toLocaleString(locale);

  type Card = { label: string; value: string; hint?: string };
  const sections: { title: string; cards: Card[] }[] = [
    {
      title: t("metrics.sectionUsers"),
      cards: [
        { label: t("metrics.users"), value: num(userCount) },
        { label: t("metrics.newUsers30"), value: num(newUsers30) },
        { label: t("metrics.admins"), value: num(adminCount) },
        { label: t("metrics.banned"), value: num(bannedCount) },
      ],
    },
    {
      title: t("metrics.sectionItems"),
      cards: [
        { label: t("metrics.items"), value: num(itemCount) },
        { label: t("metrics.newItems30"), value: num(newItems30) },
        { label: t("metrics.available"), value: num(byStatus.AVAILABLE ?? 0) },
        { label: t("metrics.reserved"), value: num(byStatus.RESERVED ?? 0) },
        { label: t("metrics.sold"), value: num(byStatus.SOLD ?? 0) },
        { label: t("metrics.hidden"), value: num(byStatus.HIDDEN ?? 0) },
        { label: t("metrics.draft"), value: num(byStatus.DRAFT ?? 0) },
        { label: t("metrics.forSale"), value: num(byType.SELL ?? 0) },
        { label: t("metrics.givingAway"), value: num(byType.GIVE ?? 0) },
        { label: t("metrics.reducedItems"), value: num(reducedCount) },
      ],
    },
    {
      title: t("metrics.sectionEngagement"),
      cards: [
        { label: t("metrics.totalViews"), value: num(viewsAgg._sum.viewCount ?? 0) },
        { label: t("metrics.totalLikes"), value: num(likeCount) },
        { label: t("metrics.signups"), value: num(signupCount) },
      ],
    },
    {
      title: t("metrics.sectionRevenue"),
      cards: [
        {
          label: t("metrics.potentialRevenue"),
          value: ils(potentialAgg._sum.priceIls ?? 0),
          hint: t("metrics.potentialRevenueHint"),
        },
        {
          label: t("metrics.realizedRevenue"),
          value: ils(soldAgg._sum.priceIls ?? 0),
          hint: t("metrics.realizedRevenueHint"),
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("metrics.title")}</h1>
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {section.cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {card.value}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </div>
                {card.hint && (
                  <div className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
                    {card.hint}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
