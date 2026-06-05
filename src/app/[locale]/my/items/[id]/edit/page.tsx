import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { canEditOwner } from "@/lib/collab";
import { prisma } from "@/lib/prisma";
import ItemForm from "@/components/ItemForm";
import type { Locale } from "@/i18n/config";
import type { ItemCategory, ItemCondition, ListingStatus, ListingType } from "@/lib/types";

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
  // Owners and the collaborators they invited may edit; admins may also reach it.
  const mayEdit = (await canEditOwner(user.id, item.ownerId)) || user.role === "ADMIN";
  if (!mayEdit) redirect(`/${locale}`);

  // A WhatsApp number is required to publish (the API silently downgrades to DRAFT
  // without one), so gate the Publish button on the owner actually having one.
  const dbUser = await prisma.user.findUnique({
    where: { id: item.ownerId },
    select: { whatsappPhone: true },
  });
  const needsPhone = !dbUser?.whatsappPhone;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("form.edit")}</h1>
      <ItemForm
        itemId={item.id}
        locale={locale}
        needsPhone={needsPhone}
        initial={{
          title: item.title,
          description: item.description,
          type: item.type as ListingType,
          category: (item.category as ItemCategory | null) ?? null,
          condition: (item.condition as ItemCondition | null) ?? null,
          priceIls: item.priceIls,
          giveIfUnsold: item.giveIfUnsold,
          // Pre-check the box when the item already displays a reduction, so editing
          // unrelated fields preserves it.
          markReduced:
            item.previousPriceIls != null &&
            item.priceIls != null &&
            item.previousPriceIls > item.priceIls,
          status: item.status as ListingStatus,
          images: item.images.map((i) => ({ cloudinaryPublicId: i.cloudinaryPublicId, url: i.url })),
        }}
      />
    </div>
  );
}
