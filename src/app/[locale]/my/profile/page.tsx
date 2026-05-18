import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import type { Locale } from "@/i18n/config";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const user = await requireUser();
  const data = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, whatsappPhone: true, city: true },
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.profile")}</h1>
      <ProfileForm
        initial={{
          name: data?.name ?? "",
          whatsappPhone: data?.whatsappPhone ?? "",
          city: data?.city ?? "",
        }}
        labels={{
          name: t("form.name"),
          phone: t("form.phone"),
          city: t("form.city"),
          cityPlaceholder: t("form.cityPlaceholder"),
          save: t("form.save"),
          saved: t("form.saved"),
        }}
      />
    </div>
  );
}
