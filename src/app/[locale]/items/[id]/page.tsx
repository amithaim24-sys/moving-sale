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

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, name: true, whatsappPhone: true, banned: true, city: true } },
    },
  });

  if (!item) notFound();

  const viewer = await getOptionalUser();
  const isOwner = !!viewer && viewer.id === item.owner.id;
  const isAdmin = !!viewer && viewer.role === "ADMIN";

  // Hidden listings and listings owned by banned users are only visible to admins.
  if ((item.status === "HIDDEN" || item.owner.banned) && !isAdmin) redirect(`/${locale}`);
  // Drafts are owner-only (admins may also view for moderation).
  if (item.status === "DRAFT" && !isOwner && !isAdmin) redirect(`/${locale}`);

  // Count public views. Skip owner and admin to keep the metric meaningful.
  if (!isOwner && !isAdmin && item.status === "AVAILABLE") {
    prisma.item
      .update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
  }

  const liked = viewer
    ? !!(await prisma.itemLike.findUnique({
        where: { userId_itemId: { userId: viewer.id, itemId: item.id } },
        select: { id: true },
      }))
    : false;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const itemUrl = `${proto}://${host}/${locale}/items/${item.id}`;

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

        <div className="sticky bottom-2 md:static">
          <WhatsAppButton phone={item.owner.whatsappPhone} title={item.title} itemUrl={itemUrl} />
        </div>
      </div>
    </div>
  );
}
