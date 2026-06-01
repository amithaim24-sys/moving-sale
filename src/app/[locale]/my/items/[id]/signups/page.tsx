import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/config";

export default async function ItemSignupsPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();

  const item = await prisma.item.findUnique({
    where: { id },
    select: { id: true, title: true, ownerId: true, giveIfUnsold: true },
  });
  if (!item) notFound();
  // Signups are owner-only — collaborators can edit the item but don't see this list.
  if (item.ownerId !== user.id) redirect(`/${locale}`);

  const signups = await prisma.giveIfUnsoldSignup.findMany({
    where: { itemId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      user: { select: { name: true, email: true, whatsappPhone: true, city: true } },
    },
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/my/items`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← {t("nav.myItems")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{t("signups.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("signups.subtitle", { title: item.title })}
        </p>
      </div>

      {signups.length === 0 ? (
        <p className="text-sm text-slate-500">{t("signups.none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-start">{t("signups.colName")}</th>
                <th className="px-3 py-2 text-start">{t("signups.colWhatsApp")}</th>
                <th className="px-3 py-2 text-start">{t("signups.colCity")}</th>
                <th className="px-3 py-2 text-start">{t("signups.colDate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {signups.map((s) => {
                const phone = s.user.whatsappPhone?.replace(/\D/g, "");
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{s.user.name ?? s.user.email}</td>
                    <td className="px-3 py-2">
                      {s.user.whatsappPhone ? (
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {s.user.whatsappPhone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{s.user.city ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{dateFmt.format(s.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
