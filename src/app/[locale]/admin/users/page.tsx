import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AdminUserRow from "./AdminUserRow";
import PromoteAllSellersButton from "./PromoteAllSellersButton";
import type { Locale } from "@/i18n/config";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const viewer = await requireAdmin();
  const viewerIsOwner = viewer.role === "OWNER";

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, banned: true, _count: { select: { items: true } } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("users")}</h1>
        {viewerIsOwner && <PromoteAllSellersButton />}
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-start">
            <tr>
              <th className="px-3 py-2 text-start">Email</th>
              <th className="px-3 py-2 text-start">Name</th>
              <th className="px-3 py-2 text-start">{t("role")}</th>
              <th className="px-3 py-2 text-start">Items</th>
              <th className="px-3 py-2 text-start"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <AdminUserRow
                key={u.id}
                viewerIsOwner={viewerIsOwner}
                user={{ id: u.id, name: u.name, email: u.email, role: u.role as "USER" | "SELLER" | "ADMIN" | "OWNER", banned: u.banned, itemCount: u._count.items }}
                labels={{
                  promote: t("promote"),
                  demote: t("demote"),
                  makeSeller: t("makeSeller"),
                  makeBuyer: t("makeBuyer"),
                  ban: t("ban"),
                  unban: t("unban"),
                  owner: t("ownerBadge"),
                  sellerBadge: t("sellerBadge"),
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
