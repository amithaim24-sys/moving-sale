import { getTranslations, setRequestLocale } from "next-intl/server";
import SignInGoogleButton from "@/components/SignInGoogleButton";
import type { Locale } from "@/i18n/config";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  // Only honor same-origin relative callback paths (must start with a single "/")
  // so the param can't be turned into an open redirect.
  const { callbackUrl } = await searchParams;
  const safeCallback =
    callbackUrl && /^\/(?!\/)/.test(callbackUrl) ? callbackUrl : `/${locale}`;

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl bg-white p-8 shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h1 className="text-xl font-bold">{t("signInTitle")}</h1>
      <p className="text-slate-600">{t("signInBlurb")}</p>
      <SignInGoogleButton label={t("signInGoogle")} callbackUrl={safeCallback} />
    </div>
  );
}
