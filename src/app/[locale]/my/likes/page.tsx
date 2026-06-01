import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import ItemCard from "@/components/ItemCard";
import EmptyState from "@/components/EmptyState";
import type { Locale } from "@/i18n/config";

export default async function MyLikesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();

  const likes = await prisma.itemLike.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      item: {
        // Only the columns ItemCard needs, plus `status` for the visibility filter.
        select: {
          id: true,
          title: true,
          type: true,
          priceIls: true,
          previousPriceIls: true,
          giveIfUnsold: true,
          status: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          owner: { select: { name: true, whatsappPhone: true, city: true } },
          _count: { select: { images: true } },
        },
      },
    },
  });

  const visible = likes.filter((l) => l.item && l.item.status !== "HIDDEN");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.likes")}</h1>
      {visible.length === 0 ? (
        <EmptyState
          emoji="💚"
          title={t("item.noLikes")}
          description={t("item.noLikesHint")}
          cta={{ href: `/${locale}`, label: t("nav.browse") }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {visible.map(({ item }) => (
            <ItemCard
              key={item.id}
              locale={locale}
              liked
              isLoggedIn
              item={{
                id: item.id,
                title: item.title,
                type: item.type as "SELL" | "GIVE",
                priceIls: item.priceIls,
                previousPriceIls: item.previousPriceIls,
                giveIfUnsold: item.giveIfUnsold,
                images: item.images,
                imageCount: item._count.images,
                owner: item.owner,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
