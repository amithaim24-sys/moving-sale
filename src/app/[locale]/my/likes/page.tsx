import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import ItemCard from "@/components/ItemCard";
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
    include: {
      item: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          owner: { select: { name: true, whatsappPhone: true, city: true } },
        },
      },
    },
  });

  const visible = likes.filter((l) => l.item && l.item.status !== "HIDDEN");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.likes")}</h1>
      {visible.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">{t("item.noLikes")}</p>
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
                images: item.images,
                owner: item.owner,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
