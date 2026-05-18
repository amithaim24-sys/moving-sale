import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOptionalUser } from "@/lib/guards";
import LanguageToggle from "./LanguageToggle";
import DarkModeToggle from "./DarkModeToggle";
import SignOutButton from "./SignOutButton";
import MobileMenu from "./MobileMenu";
import type { Locale } from "@/i18n/config";

export default async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations();
  const user = await getOptionalUser();

  const navItems: { href: string; label: string }[] = [
    { href: `/${locale}`, label: t("nav.browse") },
  ];
  if (user) {
    navItems.push({ href: `/${locale}/my/items`, label: t("nav.myItems") });
    navItems.push({ href: `/${locale}/my/items/new`, label: t("nav.newItem") });
    navItems.push({ href: `/${locale}/my/likes`, label: t("nav.likes") });
    navItems.push({ href: `/${locale}/my/profile`, label: t("nav.profile") });
    if (user.role === "ADMIN") {
      navItems.push({ href: `/${locale}/admin/items`, label: t("nav.admin") });
    }
  }

  const authNode = user ? (
    <SignOutButton label={t("nav.signOut")} />
  ) : (
    <Link
      href={`/${locale}/signin`}
      className="btn-primary whitespace-nowrap text-sm"
    >
      {t("nav.signIn")}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-4">
        <Link
          href={`/${locale}`}
          className="me-1 truncate text-base font-bold text-brand sm:text-lg"
        >
          {t("app.title")}
        </Link>

        {/* Desktop nav (md and up) */}
        <nav className="hidden flex-1 items-center gap-0.5 ps-3 text-sm font-medium md:flex">
          {navItems.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="rounded-lg px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {it.label}
            </Link>
          ))}
        </nav>

        {/* Mobile spacer pushes controls to the end */}
        <div className="flex-1 md:hidden" />

        {/* Always-visible controls (small) */}
        <DarkModeToggle />
        <LanguageToggle currentLocale={locale} />

        {/* Desktop sign-in/out */}
        <div className="hidden md:block">{authNode}</div>

        {/* Mobile hamburger (contains nav + auth) */}
        <MobileMenu items={navItems} authNode={authNode} />
      </div>
    </header>
  );
}
