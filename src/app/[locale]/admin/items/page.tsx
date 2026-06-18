import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AdminItemActions from "./AdminItemActions";
import type { Locale } from "@/i18n/config";

export default async function AdminItemsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  await requireAdmin();

  const items = await prisma.item.findMany({
    // Project only the columns this list renders. Avoids hauling the (potentially
    // large) `description` free-text and other unused columns across up to 200 rows.
    select: {
      id: true,
      title: true,
      status: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      owner: { select: { email: true, name: true } },
      // Which white-label store this item lives in. `null` = the original root
      // catalog (the main site). Surfaced as a badge so admins can tell at a
      // glance which store each listing belongs to.
      store: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.items")}</h1>
      <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:divide-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {item.images[0] && (
                <Image src={item.images[0].url} alt="" fill className="object-cover" sizes="64px" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/items/${item.id}`} className="truncate font-medium hover:underline">
                  {item.title}
                </Link>
                {item.store ? (
                  <Link
                    href={`/${locale}/s/${item.store.slug}`}
                    className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300"
                    title={t("admin.itemStore", { store: item.store.name })}
                  >
                    🏬 {item.store.name}
                  </Link>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t("admin.overview.mainSite")}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {item.owner.email} · {t(`item.status.${item.status as "AVAILABLE"}`)}
                {" · "}👁 {t("item.viewsCount", { count: item.viewCount })}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {t("admin.itemCreatedAt", {
                  date: item.createdAt.toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })}
                {" · "}
                {t("admin.itemUpdatedAt", {
                  date: item.updatedAt.toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })}
              </div>
            </div>
            <AdminItemActions
              id={item.id}
              hidden={item.status === "HIDDEN"}
              labels={{
                hide: t("admin.hide"),
                show: t("admin.show"),
                delete: t("form.delete"),
                confirmDelete: t("form.confirmDelete"),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
