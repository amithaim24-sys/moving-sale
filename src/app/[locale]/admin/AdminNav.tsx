"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// Shared tab strip across the admin pages. Highlights the active section by
// comparing the current pathname (which includes the /<locale> prefix) to each tab.
export default function AdminNav({ locale, role }: { locale: string; role?: string }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isOwner = role === "OWNER";

  // `ownerOnly` tabs (bugs/issues logs, stores, site requests) are hidden from a
  // delegated admin, who only manages dashboard/items/analytics/users.
  const tabs = [
    { href: `/${locale}/admin`, label: t("dashboard"), exact: true },
    { href: `/${locale}/admin/items`, label: t("items") },
    { href: `/${locale}/admin/views`, label: t("viewsTab") },
    { href: `/${locale}/admin/clicks`, label: t("clicksTab") },
    { href: `/${locale}/admin/logs`, label: t("logsTab"), ownerOnly: true },
    { href: `/${locale}/admin/users`, label: t("users") },
    { href: `/${locale}/admin/stores`, label: t("storesTab"), ownerOnly: true },
    { href: `/${locale}/admin/requests`, label: t("requestsTab"), ownerOnly: true },
  ].filter((tab) => isOwner || !tab.ownerOnly);

  return (
    <nav className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-xl bg-brand px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-xl px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
