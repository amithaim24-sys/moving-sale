import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import ItemForm from "@/components/ItemForm";
import type { Locale } from "@/i18n/config";
import type { ListingStatus, ListingType } from "@/lib/types";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();

  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!item) notFound();
  if (item.ownerId !== user.id && user.role !== "ADMIN") redirect(`/${locale}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("form.edit")}</h1>
      <ItemForm
        itemId={item.id}
        locale={locale}
        needsPhone={false}
        initial={{
          title: item.title,
          description: item.description,
          type: item.type as ListingType,
          priceIls: item.priceIls,
          status: item.status as ListingStatus,
          images: item.images.map((i) => ({ cloudinaryPublicId: i.cloudinaryPublicId, url: i.url })),
        }}
      />
    </div>
  );
}
