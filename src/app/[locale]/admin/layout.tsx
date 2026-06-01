import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import AdminNav from "./AdminNav";

// Gate every /admin route in one place and give them a shared tab strip.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  return (
    <div className="space-y-6">
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}
