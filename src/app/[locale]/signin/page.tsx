import { getTranslations, setRequestLocale } from "next-intl/server";
import SignInGoogleButton from "@/components/SignInGoogleButton";
import type { Locale } from "@/i18n/config";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl bg-white p-8 shadow ring-1 ring-slate-200">
      <h1 className="text-xl font-bold">{t("signInTitle")}</h1>
      <p className="text-slate-600">{t("signInBlurb")}</p>
      <SignInGoogleButton label={t("signInGoogle")} />
    </div>
  );
}
