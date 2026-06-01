import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import PriceOrFreeBadge from "@/components/PriceOrFreeBadge";
import MyItemActions from "./MyItemActions";
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
    // Project only the columns this list renders (the income summary needs type,
    // priceIls and status). Avoids hauling the (potentially large) `description`
    // free-text and other unused columns across every owned listing.
    select: {
      id: true,
      title: true,
      type: true,
      priceIls: true,
      previousPriceIls: true,
      status: true,
      viewCount: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Possible income = sum of prices of priced (SELL) items still available to sell.
  // "Already sold" tracks what those SELL items have brought in once marked SOLD.
  const sellItems = items.filter((i) => i.type === "SELL" && i.priceIls != null);
  const potentialIncome = sellItems
    .filter((i) => i.status !== "SOLD")
    .reduce((sum, i) => sum + (i.priceIls ?? 0), 0);
  const alreadySold = sellItems
    .filter((i) => i.status === "SOLD")
    .reduce((sum, i) => sum + (i.priceIls ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("nav.myItems")}</h1>
        <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
          + {t("nav.newItem")}
        </Link>
      </div>
      {sellItems.length > 0 && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800/60">
          <div>
            <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t("my.potentialIncome")}
            </div>
            <div className="text-xs text-amber-700/80 dark:text-amber-200/70">
              {t("my.potentialIncomeHint")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {t("item.ils", { price: potentialIncome })}
            </div>
            {alreadySold > 0 && (
              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                {t("my.alreadySold")}: {t("item.ils", { price: alreadySold })}
              </div>
            )}
          </div>
        </div>
      )}
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
              <MyItemActions
                id={item.id}
                editHref={`/${locale}/my/items/${item.id}/edit`}
                isSold={item.status === "SOLD"}
                labels={{
                  edit: t("form.edit"),
                  markSold: t("form.markSold"),
                  markAvailable: t("form.markAvailable"),
                  delete: t("form.delete"),
                  confirmDelete: t("form.confirmDelete"),
                  actionFailed: t("my.actionFailed"),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
