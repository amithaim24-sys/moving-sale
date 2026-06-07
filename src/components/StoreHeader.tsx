import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LanguageToggle from "./LanguageToggle";
import DarkModeToggle from "./DarkModeToggle";
import SignOutButton from "./SignOutButton";
import type { Locale } from "@/i18n/config";

// Store-scoped header — the white-label equivalent of Header.tsx. Brands the page
// with the STORE name (not the main app), links stay inside `/s/<slug>/…`, and it
// deliberately omits the main-site "Want a website like this?" CTA. Rendered by the
// locale layout whenever the current route is a store route.
export default async function StoreHeader({
  locale,
  slug,
  storeName,
  isSignedIn,
  isStoreAdmin,
}: {
  locale: Locale;
  slug: string;
  storeName: string;
  isSignedIn: boolean;
  isStoreAdmin: boolean;
}) {
  const t = await getTranslations();
  const base = `/${locale}/s/${slug}`;

  const navItems: { href: string; label: string }[] = [
    { href: base, label: t("nav.browse") },
  ];
  if (isStoreAdmin) {
    navItems.push({ href: `${base}/admin`, label: t("store.manageItems") });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-4">
        <Link href={base} className="me-1 truncate text-base font-bold text-brand sm:text-lg">
          {storeName}
        </Link>

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

        <div className="flex-1 md:hidden" />

        <DarkModeToggle />
        <LanguageToggle currentLocale={locale} />

        <div className="hidden md:block">
          {isSignedIn ? (
            <SignOutButton label={t("nav.signOut")} callbackUrl={base} />
          ) : (
            <Link
              href={`/${locale}/signin?callbackUrl=${encodeURIComponent(base)}`}
              className="btn-primary whitespace-nowrap text-sm"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
