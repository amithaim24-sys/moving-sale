import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { defaultLocale, locales } from "@/i18n/config";

export default async function SignInRedirect() {
  const c = await cookies();
  const v = c.get("NEXT_LOCALE")?.value;
  const locale = (locales as readonly string[]).includes(v ?? "") ? v : defaultLocale;
  redirect(`/${locale}/signin`);
}
