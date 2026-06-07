import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import PriceOrFreeBadge from "@/components/PriceOrFreeBadge";
import WhatsAppButton from "@/components/WhatsAppButton";
import GiveIfUnsoldSignupButton from "@/components/GiveIfUnsoldSignupButton";
import LikeButton from "@/components/LikeButton";
import ItemGallery from "@/components/ItemGallery";
import ConditionBadge from "@/components/ConditionBadge";
import { getStoreBySlug } from "@/lib/stores";
import { getOptionalUser } from "@/lib/guards";
import { isPlatformAdmin } from "@/lib/types";
import type { Locale } from "@/i18n/config";

// Cached so generateMetadata and the page share one query.
const getItem = cache((id: string) =>
  prisma.item.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, name: true, whatsappPhone: true, banned: true, city: true } },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const [store, item] = await Promise.all([getStoreBySlug(slug), getItem(id)]);
  if (!store || !item || item.storeId !== store.id) return { title: store?.name ?? "—" };
  return { title: `${item.title} · ${store.name}`, robots: { index: false } };
}

// Store-branded item detail. Mirrors the main item page but is scoped to one store:
// the item must belong to this store, and the chrome (header/footer/nav) comes from
// the store layout. Like/contact/signup go through the same global APIs by item id.
export default async function StoreItemPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; id: string }>;
}) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [store, item, viewer] = await Promise.all([
    getStoreBySlug(slug),
    getItem(id),
    getOptionalUser(),
  ]);

  if (!store) notFound();
  // The item must exist and belong to THIS store — no cross-store leakage.
  if (!item || item.storeId !== store.id) notFound();

  const isOwner = !!viewer && viewer.id === item.owner.id;
  const isAdmin = isPlatformAdmin(viewer?.role);
  const base = `/${locale}/s/${store.slug}`;

  if ((item.status === "HIDDEN" || item.owner.banned) && !isOwner && !isAdmin) redirect(base);
  if (item.status === "DRAFT" && !isOwner && !isAdmin) redirect(base);

  const shouldCountView = !isOwner && !isAdmin && item.status === "AVAILABLE";
  const signupEligible = item.type === "SELL" && item.giveIfUnsold;
  const [, likedRow, signupRow] = await Promise.all([
    shouldCountView
      ? Promise.all([
          prisma.item.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } }).catch(() => {}),
          viewer
            ? prisma.itemView.create({ data: { itemId: item.id, userId: viewer.id } }).catch(() => {})
            : Promise.resolve(),
        ])
      : Promise.resolve(),
    viewer
      ? prisma.itemLike.findUnique({
          where: { userId_itemId: { userId: viewer.id, itemId: item.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    viewer && signupEligible && !isOwner
      ? prisma.giveIfUnsoldSignup.findUnique({
          where: { itemId_userId: { itemId: item.id, userId: viewer.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  const liked = !!likedRow;
  const signedUp = !!signupRow;

  return (
    <div className="space-y-4">
      <Link href={base} className="text-sm text-brand hover:underline">
        ← {t("nav.browse")}
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <ItemGallery images={item.images.map((i) => ({ id: i.id, url: i.url }))} title={item.title} />
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <div className="flex items-center gap-2">
              <LikeButton itemId={item.id} initiallyLiked={liked} isLoggedIn={!!viewer} locale={locale} size="lg" />
              <PriceOrFreeBadge
                type={item.type as "SELL" | "GIVE"}
                priceIls={item.priceIls}
                previousPriceIls={item.previousPriceIls}
              />
            </div>
          </div>
          {(item.condition || item.category) && (
            <div className="flex flex-wrap items-center gap-2">
              {item.condition && <ConditionBadge condition={item.condition} />}
              {item.category && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t(`item.category.${item.category}`)}
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("item.by", { name: item.owner.name ?? "—" })}
            {item.owner.city ? ` · ${item.owner.city}` : ""}
          </p>
          {(isOwner || isAdmin) && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              👁 {t("item.viewsCount", { count: item.viewCount })}
            </p>
          )}
          {item.description && (
            <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">{item.description}</p>
          )}

          <div className="sticky bottom-2 space-y-3 md:static">
            <WhatsAppButton
              itemId={item.id}
              hasPhone={!!item.owner.whatsappPhone}
              isLoggedIn={!!viewer}
              locale={locale}
            />
            {signupEligible && (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">🎁 {t("item.giveIfUnsold.note")}</p>
                {!isOwner && (
                  <GiveIfUnsoldSignupButton
                    itemId={item.id}
                    isLoggedIn={!!viewer}
                    initiallySignedUp={signedUp}
                    locale={locale}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
