import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import PriceOrFreeBadge from "@/components/PriceOrFreeBadge";
import type { Locale } from "@/i18n/config";

export default async function MyItemsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();
  const items = await prisma.item.findMany({
    where: { ownerId: user.id },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("nav.myItems")}</h1>
        <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
          + {t("nav.newItem")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-500">{t("item.noItems")}</p>
      ) : (
        <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.images[0] && (
                  <Image src={item.images[0].url} alt="" fill className="object-cover" sizes="64px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{item.title}</div>
                <div className="text-xs text-slate-500">
                  {t(`item.status.${item.status as "AVAILABLE"}`)}
                  {" · "}👁 {t("item.viewsCount", { count: item.viewCount })}
                </div>
              </div>
              <PriceOrFreeBadge
                type={item.type as "SELL" | "GIVE"}
                priceIls={item.priceIls}
                previousPriceIls={item.previousPriceIls}
              />
              <Link href={`/${locale}/my/items/${item.id}/edit`} className="btn-secondary text-sm">
                {t("form.edit")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
