"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h4v-6h6v6h4V10" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0116 0" />
  </svg>
);

type Tab = { href: string; label: string; icon: React.FC; highlight?: boolean };

// Store-scoped mobile bottom nav — links stay inside `/s/<slug>/…`.
export default function StoreBottomNav({
  locale,
  slug,
  isSignedIn,
  isStoreAdmin,
}: {
  locale: string;
  slug: string;
  isSignedIn: boolean;
  isStoreAdmin: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/${locale}/s/${slug}`;

  const tabs: Tab[] = [{ href: base, label: t("browse"), icon: HomeIcon }];
  if (isStoreAdmin) {
    // Owner: quick "add item" (uses the shared create form, auto-filed into this
    // store) + the store admin dashboard.
    tabs.push({ href: `/${locale}/my/items/new`, label: t("newItem"), icon: PlusIcon, highlight: true });
    tabs.push({ href: `${base}/admin`, label: t("admin"), icon: ShieldIcon });
  } else if (!isSignedIn) {
    tabs.push({
      href: `/${locale}/signin?callbackUrl=${encodeURIComponent(base)}`,
      label: t("signIn"),
      icon: UserIcon,
    });
  }

  function isActive(href: string) {
    if (href === base) return pathname === base || pathname === `${base}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Store navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          if (tab.highlight) {
            return (
              <li key={tab.href} className="flex items-center">
                <Link
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                  className="-mt-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95"
                >
                  <Icon />
                </Link>
              </li>
            );
          }
          return (
            <li key={`${tab.href}-${tab.label}`} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition ${
                  active
                    ? "text-brand"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
