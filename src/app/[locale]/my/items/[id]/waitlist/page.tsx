import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { canEditOwner } from "@/lib/collab";
import { prisma } from "@/lib/prisma";
import WaitlistManager from "./WaitlistManager";
import type { Locale } from "@/i18n/config";

export default async function ItemWaitlistPage({
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
    select: { id: true, title: true, ownerId: true, priceIls: true, type: true },
  });
  if (!item) notFound();
  // The owner and any collaborator who co-manages the owner's items may manage the waitlist.
  if (!(await canEditOwner(user.id, item.ownerId))) redirect(`/${locale}`);

  const waitlisters = await prisma.waitlister.findMany({
    where: { itemId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, phone: true, notifiedAt: true, createdAt: true },
  });

  // Price suffix the "it's ready" message can include (free items have no price).
  const priceLabel =
    item.type === "SELL" && item.priceIls != null ? t("item.ils", { price: item.priceIls }) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/my/items`} className="text-sm text-slate-500 hover:underline">
          ← {t("nav.myItems")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{t("waitlist.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("waitlist.subtitle", { title: item.title })}
        </p>
      </div>

      <WaitlistManager
        itemId={item.id}
        itemTitle={item.title}
        itemPath={`/${locale}/items/${item.id}`}
        priceLabel={priceLabel}
        initial={waitlisters.map((w) => ({
          id: w.id,
          name: w.name,
          phone: w.phone,
          notifiedAt: w.notifiedAt ? w.notifiedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
