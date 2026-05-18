import { getTranslations, setRequestLocale } from "next-intl/server";
import SignOutButton from "@/components/SignOutButton";
import type { Locale } from "@/i18n/config";

export default async function BannedPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h1 className="text-xl font-bold text-red-600">{t("banned.title")}</h1>
      <p className="text-slate-600 dark:text-slate-300">{t("banned.body")}</p>
      <div className="pt-2">
        <SignOutButton label={t("nav.signOut")} />
      </div>
    </div>
  );
}
