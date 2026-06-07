import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import SiteAnalytics from "@/components/admin/SiteAnalytics";
import type { Locale } from "@/i18n/config";

// Per-website (per-store) analytics — the global super-admin's drill-down into a
// single white-label site they created. Owner-only; the dashboard body is fully
// scoped to this one store, so the main site and other stores never leak in.
export default async function AdminStoreAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireOwner();

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      active: true,
      owner: { select: { name: true, email: true } },
    },
  });
  if (!store) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href={`/${locale}/admin`} className="text-xs font-medium text-brand hover:underline">
          {t("storeAnalytics.back")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <span className="truncate">{t("storeAnalytics.title", { name: store.name })}</span>
              <span
                className={
                  store.active
                    ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }
              >
                {store.active ? t("stores.active") : t("stores.inactive")}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("storeAnalytics.subtitle")}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("storeAnalytics.ownerLabel")}: {store.owner.name ? `${store.owner.name} · ` : ""}
              {store.owner.email}
            </p>
          </div>
          <a
            href={`/${locale}/s/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary shrink-0 text-xs"
          >
            {t("storeAnalytics.openStore")} ↗
          </a>
        </div>
      </div>

      <SiteAnalytics storeId={store.id} storeSlug={store.slug} locale={locale} />
    </div>
  );
}
