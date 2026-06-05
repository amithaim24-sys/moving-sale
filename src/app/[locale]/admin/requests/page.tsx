import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AdminRequestRow from "./AdminRequestRow";
import type { Locale } from "@/i18n/config";

// Leads from the public "I want a website like this" call-to-action.
export default async function AdminRequestsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  const requests = await prisma.websiteRequest.findMany({
    // NEW first, then most recent.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, email: true, phone: true, message: true, status: true, createdAt: true },
    take: 300,
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("requestsPage.title")}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("requestsPage.subtitle")}</p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-slate-500">{t("requestsPage.none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2 text-start">{t("requestsPage.colName")}</th>
                <th className="px-3 py-2 text-start">{t("requestsPage.colEmail")}</th>
                <th className="px-3 py-2 text-start">{t("requestsPage.colWhatsApp")}</th>
                <th className="px-3 py-2 text-start">{t("requestsPage.colMessage")}</th>
                <th className="px-3 py-2 text-start">{t("requestsPage.colWhen")}</th>
                <th className="px-3 py-2 text-start">{t("requestsPage.colStatus")}</th>
                <th className="px-3 py-2 text-start"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <AdminRequestRow
                  key={r.id}
                  request={{
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    phone: r.phone,
                    message: r.message,
                    status: r.status as "NEW" | "HANDLED",
                    when: dateFmt.format(r.createdAt),
                  }}
                  labels={{
                    newBadge: t("requestsPage.statusNew"),
                    handledBadge: t("requestsPage.statusHandled"),
                    markHandled: t("requestsPage.markHandled"),
                    markNew: t("requestsPage.markNew"),
                    delete: t("requestsPage.delete"),
                    confirmDelete: t("requestsPage.confirmDelete"),
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
