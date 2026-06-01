import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import PriceOrFreeBadge from "@/components/PriceOrFreeBadge";
import WhatsAppButton from "@/components/WhatsAppButton";
import LikeButton from "@/components/LikeButton";
import ItemGallery from "@/components/ItemGallery";
import { getOptionalUser } from "@/lib/guards";
import type { Locale } from "@/i18n/config";

// Cached so generateMetadata and the page itself share a single DB query.
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
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const item = await getItem(id);
  const t = await getTranslations({ locale });

  // Never expose private/non-public listings to crawlers and link previews.
  if (!item || item.status === "HIDDEN" || item.status === "DRAFT" || item.owner.banned) {
    return { title: t("app.title") };
  }

  const priceLabel =
    item.type === "GIVE" || item.priceIls == null
      ? t("item.free")
      : t("item.ils", { price: item.priceIls.toLocaleString() });
  const desc = item.description?.trim();
  const description =
    desc && desc.length > 0
      ? desc.replace(/\s+/g, " ").slice(0, 200)
      : `${priceLabel}${item.owner.city ? ` · ${item.owner.city}` : ""}`;
  const ogTitle = `${item.title} — ${priceLabel}`;
  const image = item.images[0]?.url;

  return {
    title: item.title,
    description,
    alternates: { canonical: `/${locale}/items/${item.id}` },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      locale: locale === "he" ? "he_IL" : "en_US",
      ...(image ? { images: [{ url: image, alt: item.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: ogTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // The listing and the viewer's session are independent lookups — fetch them
  // concurrently instead of serializing two round-trips on this hot page.
  const [item, viewer] = await Promise.all([getItem(id), getOptionalUser()]);

  if (!item) notFound();

  const isOwner = !!viewer && viewer.id === item.owner.id;
  const isAdmin = !!viewer && viewer.role === "ADMIN";

  // Hidden listings and listings owned by banned users are only visible to admins.
  if ((item.status === "HIDDEN" || item.owner.banned) && !isAdmin) redirect(`/${locale}`);
  // Drafts are owner-only (admins may also view for moderation).
  if (item.status === "DRAFT" && !isOwner && !isAdmin) redirect(`/${locale}`);

  // Count public views (skip owner/admin to keep the metric meaningful) and look up
  // whether the viewer already liked this item. The two writes/reads are independent,
  // so run them concurrently rather than back-to-back. The increment is awaited so the
  // write flushes before the serverless function returns.
  const shouldCountView = !isOwner && !isAdmin && item.status === "AVAILABLE";
  const [, likedRow] = await Promise.all([
    shouldCountView
      ? prisma.item
          .update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } })
          .catch(() => {})
      : Promise.resolve(),
    viewer
      ? prisma.itemLike.findUnique({
          where: { userId_itemId: { userId: viewer.id, itemId: item.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  const liked = !!likedRow;

  // Build the share URL from a trusted configured base, not attacker-controllable
  // forwarded headers. Fall back to request headers only if no base URL is set.
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL;
  if (!baseUrl) {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    baseUrl = `${proto}://${host}`;
  }
  const itemUrl = `${baseUrl.replace(/\/$/, "")}/${locale}/items/${item.id}`;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <ItemGallery
          images={item.images.map((i) => ({ id: i.id, url: i.url }))}
          title={item.title}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{item.title}</h1>
          <div className="flex items-center gap-2">
            <LikeButton
              itemId={item.id}
              initiallyLiked={liked}
              isLoggedIn={!!viewer}
              locale={locale}
              size="lg"
            />
            <PriceOrFreeBadge
              type={item.type as "SELL" | "GIVE"}
              priceIls={item.priceIls}
              previousPriceIls={item.previousPriceIls}
            />
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("item.by", { name: item.owner.name ?? "—" })}
          {item.owner.city ? ` · ${item.owner.city}` : ""}
          {item.condition ? ` · ${t(`item.condition.${item.condition as "NEW"}`)}` : ""}
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
            phone={viewer ? item.owner.whatsappPhone : null}
            title={item.title}
            itemUrl={itemUrl}
            isLoggedIn={!!viewer}
            locale={locale}
          />

          {/* "Give away if unsold" fallback: only for items still for sale. */}
          {item.type === "SELL" && item.giveIfUnsold && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                🎁 {t("item.giveIfUnsold.note")}
              </p>
              <WhatsAppButton
                phone={viewer ? item.owner.whatsappPhone : null}
                title={item.title}
                itemUrl={itemUrl}
                isLoggedIn={!!viewer}
                locale={locale}
                variant="outline"
                label={t("item.giveIfUnsold.contactCta")}
                message={t("item.giveIfUnsold.waMessage", { title: item.title, url: itemUrl })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
