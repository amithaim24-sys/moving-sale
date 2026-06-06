import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/url";
import { TIME_ZONE } from "@/lib/analytics";
import CreateStoreForm from "./CreateStoreForm";
import StoreRow from "./StoreRow";
import type { Locale } from "@/i18n/config";

export default async function AdminStoresPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  const [stores, origin] = await Promise.all([
    prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        active: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    absoluteUrl(""),
  ]);

  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: TIME_ZONE });

  const labels = {
    open: t("stores.open"),
    copyLink: t("stores.copyLink"),
    copied: t("stores.copied"),
    activate: t("stores.activate"),
    deactivate: t("stores.deactivate"),
    active: t("stores.active"),
    inactive: t("stores.inactive"),
    delete: t("stores.delete"),
    confirmDelete: t("stores.confirmDelete"),
    items: t("stores.itemsCount"),
    actionFailed: t("stores.actionFailed"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("stores.title")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("stores.intro")}</p>
      </div>

      <CreateStoreForm locale={locale} />

      {stores.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("stores.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {stores.map((s) => (
            <StoreRow
              key={s.id}
              locale={locale}
              store={{
                id: s.id,
                slug: s.slug,
                name: s.name,
                tagline: s.tagline,
                active: s.active,
                itemCount: s._count.items,
                ownerName: s.owner.name,
                ownerEmail: s.owner.email,
                createdLabel: dtf.format(s.createdAt),
                url: `${origin}/${locale}/s/${s.slug}`,
              }}
              labels={labels}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
