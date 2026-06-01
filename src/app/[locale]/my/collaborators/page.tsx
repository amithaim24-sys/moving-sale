import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import CollaboratorsManager from "./CollaboratorsManager";
import type { Locale } from "@/i18n/config";

export default async function CollaboratorsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();

  const rows = await prisma.collaborator.findMany({
    where: { ownerId: user.id },
    select: { id: true, collaborator: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("collab.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("collab.subtitle")}</p>
      </div>
      <CollaboratorsManager
        initial={rows.map((r) => ({
          id: r.id,
          name: r.collaborator.name,
          email: r.collaborator.email,
        }))}
      />
    </div>
  );
}
