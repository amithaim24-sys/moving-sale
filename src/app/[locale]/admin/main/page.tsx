import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import SiteAnalytics from "@/components/admin/SiteAnalytics";
import type { Locale } from "@/i18n/config";

// Full analytics for the MAIN/original marketplace only (Item.storeId IS NULL).
// Kept separate from the white-label stores so no website's numbers are combined.
// Open to any platform admin (it's the main site, not a store).
export default async function AdminMainSiteAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/${locale}/admin`} className="text-xs font-medium text-brand hover:underline">
          {t("storeAnalytics.back")}
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("overview.mainSite")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("overview.mainSiteSubtitle")}</p>
        </div>
      </div>

      <SiteAnalytics storeId={null} storeSlug={null} locale={locale} />
    </div>
  );
}
