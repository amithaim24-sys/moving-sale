import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSeller } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import ItemForm from "@/components/ItemForm";
import type { Locale } from "@/i18n/config";

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireSeller();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { whatsappPhone: true },
  });
  const needsPhone = !dbUser?.whatsappPhone;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.newItem")}</h1>
      <ItemForm
        locale={locale}
        needsPhone={needsPhone}
        initial={{
          title: "",
          description: "",
          type: "SELL",
          category: null,
          condition: null,
          priceIls: null,
          giveIfUnsold: false,
          markReduced: false,
          status: "AVAILABLE",
          images: [],
        }}
      />
    </div>
  );
}
