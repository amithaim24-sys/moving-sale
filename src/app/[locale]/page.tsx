import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CatalogView from "@/components/CatalogView";
import DuplicateSiteCTA from "@/components/DuplicateSiteCTA";
import { getOptionalUser } from "@/lib/guards";
import type { Locale } from "@/i18n/config";

type SearchParams = Promise<{ type?: string; q?: string; category?: string }>;

// The root/primary catalog: the original moving sale. It shows only items with no
// store (storeId = null); white-label stores live at /<locale>/s/<slug>.
export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const user = await getOptionalUser();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{t("app.title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("app.tagline")}</p>
        </div>
      </div>

      <CatalogView
        locale={locale}
        storeId={null}
        basePath={`/${locale}`}
        searchParams={sp}
        viewer={user}
        newItemHref={user ? `/${locale}/my/items/new` : undefined}
      />

      <DuplicateSiteCTA defaultName={user?.name} defaultEmail={user?.email} />
    </div>
  );
}
