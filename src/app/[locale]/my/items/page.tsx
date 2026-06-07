import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { getCollaboratorOwnerIds } from "@/lib/collab";
import { getOwnedStore } from "@/lib/stores";
import { absoluteUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";
import PriceOrFreeBadge from "@/components/PriceOrFreeBadge";
import StoreShareButton from "@/components/StoreShareButton";
import MyItemActions from "./MyItemActions";
import type { Locale } from "@/i18n/config";

// Columns shared by the owned-items and shared-items lists.
const itemSelect = {
  id: true,
  title: true,
  type: true,
  priceIls: true,
  previousPriceIls: true,
  status: true,
  viewCount: true,
  giveIfUnsold: true,
  images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
  _count: { select: { waitlisters: true } },
} satisfies Prisma.ItemSelect;

// Shared (collaborating) items additionally need the owner to group/label them.
const sharedItemSelect = {
  ...itemSelect,
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ItemSelect;
type SharedItem = Prisma.ItemGetPayload<{ select: typeof sharedItemSelect }>;

export default async function MyItemsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();

  const [collabOwnerIds, ownedStore] = await Promise.all([
    getCollaboratorOwnerIds(user.id),
    getOwnedStore(user.id),
  ]);
  const storeUrl = ownedStore ? await absoluteUrl(`/${locale}/s/${ownedStore.slug}`) : null;

  const [items, sharedItems] = await Promise.all([
    prisma.item.findMany({
      where: { ownerId: user.id },
      // Project only the columns this list renders (the income summary needs type,
      // priceIls and status). Avoids hauling the (potentially large) `description`
      // free-text and other unused columns across every owned listing.
      select: { ...itemSelect, _count: { select: { giveIfUnsoldSignups: true, waitlisters: true } } },
      orderBy: { createdAt: "desc" },
    }),
    collabOwnerIds.length
      ? prisma.item.findMany({
          where: { ownerId: { in: collabOwnerIds } },
          select: sharedItemSelect,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve<SharedItem[]>([]),
  ]);

  // Possible income = sum of prices of priced (SELL) items still available to sell.
  // "Already sold" tracks what those SELL items have brought in once marked SOLD.
  const sellItems = items.filter((i) => i.type === "SELL" && i.priceIls != null);
  const potentialIncome = sellItems
    .filter((i) => i.status !== "SOLD")
    .reduce((sum, i) => sum + (i.priceIls ?? 0), 0);
  const soldSellItems = sellItems.filter((i) => i.status === "SOLD");
  const alreadySold = soldSellItems.reduce((sum, i) => sum + (i.priceIls ?? 0), 0);
  const soldCount = soldSellItems.length;

  const actionLabels = {
    edit: t("form.edit"),
    markSold: t("form.markSold"),
    markAvailable: t("form.markAvailable"),
    delete: t("form.delete"),
    confirmDelete: t("form.confirmDelete"),
    actionFailed: t("my.actionFailed"),
  };

  // Group items shared with this user by the account that shared them.
  const sharedByOwner = new Map<
    string,
    { name: string | null; email: string; items: SharedItem[] }
  >();
  for (const it of sharedItems) {
    const key = it.owner.id;
    if (!sharedByOwner.has(key)) {
      sharedByOwner.set(key, { name: it.owner.name, email: it.owner.email, items: [] });
    }
    sharedByOwner.get(key)!.items.push(it);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav.myItems")}</h1>
        <div className="flex items-center gap-2">
          {ownedStore && storeUrl && <StoreShareButton url={storeUrl} />}
          <Link href={`/${locale}/my/collaborators`} className="btn-secondary text-sm">
            {t("collab.manage")}
          </Link>
          <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
            + {t("nav.newItem")}
          </Link>
        </div>
      </div>
      {sellItems.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800/60">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t("my.potentialIncome")}
            </div>
            <div className="text-xs text-amber-700/80 dark:text-amber-200/70">
              {t("my.potentialIncomeHint")}
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
              {t("item.ils", { price: potentialIncome })}
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800/60">
            <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {t("my.earned")}
            </div>
            <div className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
              {t("my.earnedHint", { count: soldCount })}
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {t("item.ils", { price: alreadySold })}
            </div>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-slate-500">{t("item.noItems")}</p>
      ) : (
        <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:divide-slate-800">
          {items.map((item) => {
            const isSold = item.status === "SOLD";
            return (
            <li
              key={item.id}
              className={`flex items-center gap-4 p-4 ${isSold ? "bg-slate-50 dark:bg-slate-900/40" : ""}`}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.images[0] && (
                  <Image
                    src={item.images[0].url}
                    alt=""
                    fill
                    className={`object-cover ${isSold ? "opacity-40 grayscale" : ""}`}
                    sizes="64px"
                  />
                )}
                {isSold && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                      {t("item.status.SOLD")}
                    </span>
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`truncate font-medium ${isSold ? "text-slate-400 line-through dark:text-slate-500" : ""}`}
                >
                  {item.title}
                </div>
                <div className="text-xs text-slate-500">
                  <span className={isSold ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                    {t(`item.status.${item.status as "AVAILABLE"}`)}
                  </span>
                  {" · "}👁 {t("item.viewsCount", { count: item.viewCount })}
                </div>
                {item.giveIfUnsold && (
                  <Link
                    href={`/${locale}/my/items/${item.id}/signups`}
                    className="mt-0.5 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    🎁 {t("signups.countLink", { count: item._count.giveIfUnsoldSignups })}
                  </Link>
                )}
                <Link
                  href={`/${locale}/my/items/${item.id}/waitlist`}
                  className="mt-0.5 block text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
                >
                  👥 {t("waitlist.countLink", { count: item._count.waitlisters })}
                </Link>
              </div>
              <PriceOrFreeBadge
                type={item.type as "SELL" | "GIVE"}
                priceIls={item.priceIls}
                previousPriceIls={item.previousPriceIls}
              />
              <MyItemActions
                id={item.id}
                editHref={`/${locale}/my/items/${item.id}/edit`}
                isSold={isSold}
                labels={actionLabels}
              />
            </li>
            );
          })}
        </ul>
      )}

      {/* Items other accounts have invited this user to co-manage. */}
      {[...sharedByOwner.entries()].map(([ownerId, group]) => (
        <div key={ownerId} className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t("collab.sharedBy", { name: group.name ?? group.email })}
          </h2>
          <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:divide-slate-800">
            {group.items.map((item) => {
              const isSold = item.status === "SOLD";
              return (
              <li
                key={item.id}
                className={`flex items-center gap-4 p-4 ${isSold ? "bg-slate-50 dark:bg-slate-900/40" : ""}`}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.images[0] && (
                    <Image
                      src={item.images[0].url}
                      alt=""
                      fill
                      className={`object-cover ${isSold ? "opacity-40 grayscale" : ""}`}
                      sizes="64px"
                    />
                  )}
                  {isSold && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                        {t("item.status.SOLD")}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`truncate font-medium ${isSold ? "text-slate-400 line-through dark:text-slate-500" : ""}`}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className={isSold ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                      {t(`item.status.${item.status as "AVAILABLE"}`)}
                    </span>
                    {" · "}👁 {t("item.viewsCount", { count: item.viewCount })}
                  </div>
                  <Link
                    href={`/${locale}/my/items/${item.id}/waitlist`}
                    className="mt-0.5 block text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
                  >
                    👥 {t("waitlist.countLink", { count: item._count.waitlisters })}
                  </Link>
                </div>
                <PriceOrFreeBadge
                  type={item.type as "SELL" | "GIVE"}
                  priceIls={item.priceIls}
                  previousPriceIls={item.previousPriceIls}
                />
                <MyItemActions
                  id={item.id}
                  editHref={`/${locale}/my/items/${item.id}/edit`}
                  isSold={isSold}
                  labels={actionLabels}
                />
              </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
