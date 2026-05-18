import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOptionalUser } from "@/lib/guards";
import LanguageToggle from "./LanguageToggle";
import DarkModeToggle from "./DarkModeToggle";
import SignOutButton from "./SignOutButton";
import type { Locale } from "@/i18n/config";

export default async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations();
  const user = await getOptionalUser();

  return (
    <header className="border-b bg-white dark:bg-slate-900 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="text-lg font-semibold text-brand">
          {t("app.title")}
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-3 text-sm">
          <Link href={`/${locale}`} className="hover:underline">
            {t("nav.browse")}
          </Link>
          {user && (
            <>
              <Link href={`/${locale}/my/items`} className="hover:underline">
                {t("nav.myItems")}
              </Link>
              <Link href={`/${locale}/my/profile`} className="hover:underline">
                {t("nav.profile")}
              </Link>
              {user.role === "ADMIN" && (
                <Link href={`/${locale}/admin/items`} className="hover:underline">
                  {t("nav.admin")}
                </Link>
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <LanguageToggle currentLocale={locale} />
          {user ? (
            <SignOutButton label={t("nav.signOut")} />
          ) : (
            <Link href={`/${locale}/signin`} className="btn-primary text-sm">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
