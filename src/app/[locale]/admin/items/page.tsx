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
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      owner: { select: { email: true, name: true } },
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
              <Link href={`/${locale}/items/${item.id}`} className="truncate font-medium hover:underline">
                {item.title}
              </Link>
              <div className="text-xs text-slate-500">
                {item.owner.email} · {t(`item.status.${item.status as "AVAILABLE"}`)}
                {" · "}👁 {t("item.viewsCount", { count: item.viewCount })}
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
