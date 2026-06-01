import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/config";

// Full "who viewed what" log: the most recent attributable (signed-in) item views.
export default async function AdminViewsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  const views = await prisma.itemView.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      item: { select: { id: true, title: true } },
    },
  });

  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("viewsPage.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("viewsPage.subtitle")}</p>
      </div>

      {views.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
          {t("activity.none")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("viewsPage.colUser")}</th>
                <th className="px-4 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("viewsPage.colItem")}</th>
                <th className="px-4 py-2 text-end font-medium text-slate-600 dark:text-slate-300">{t("viewsPage.colWhen")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {views.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{v.user.name || "—"}</div>
                    <div className="text-xs text-slate-400">{v.user.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/${locale}/items/${v.item.id}`} className="text-slate-700 hover:underline dark:text-slate-200">
                      {v.item.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-end text-xs text-slate-500 dark:text-slate-400">
                    <time dateTime={v.createdAt.toISOString()}>{dtf.format(v.createdAt)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
