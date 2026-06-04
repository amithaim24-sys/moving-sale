import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/config";

// Items ranked by high-intent contact click count, descending.
export default async function AdminClicksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  const items = await prisma.item.findMany({
    where: { clickCount: { gt: 0 } },
    orderBy: { clickCount: "desc" },
    take: 200,
    select: { id: true, title: true, clickCount: true, viewCount: true, _count: { select: { likes: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("clicksPage.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("clicksPage.subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
          {t("activity.noneClicks")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-end font-medium text-slate-600 dark:text-slate-300">#</th>
                <th className="px-4 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("clicksPage.colItem")}</th>
                <th className="px-4 py-2 text-end font-medium text-slate-600 dark:text-slate-300">{t("clicksPage.colClicks")}</th>
                <th className="px-4 py-2 text-end font-medium text-slate-600 dark:text-slate-300">{t("clicksPage.colViews")}</th>
                <th className="px-4 py-2 text-end font-medium text-slate-600 dark:text-slate-300">{t("clicksPage.colLikes")}</th>
                <th className="px-4 py-2 text-end font-medium text-slate-600 dark:text-slate-300">{t("clicksPage.colCtr")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, i) => {
                const ctr = item.viewCount > 0 ? `${((item.clickCount / item.viewCount) * 100).toFixed(1)}%` : "—";
                return (
                  <tr key={item.id} className={i === 0 ? "bg-amber-50/60 dark:bg-amber-500/5" : undefined}>
                    <td className="whitespace-nowrap px-4 py-2 text-end font-semibold tabular-nums text-slate-400">
                      {i === 0 ? "🏆" : i + 1}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/${locale}/items/${item.id}`} className="text-slate-700 hover:underline dark:text-slate-200">
                        {item.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-end tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                      {item.clickCount.toLocaleString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-end tabular-nums text-slate-500 dark:text-slate-400">
                      {item.viewCount.toLocaleString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-end tabular-nums text-slate-500 dark:text-slate-400">
                      {item._count.likes.toLocaleString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-end text-slate-500 dark:text-slate-400">
                      {ctr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
