import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

// Dedupe the session lookup within a single request — layout, header, and the page
// itself all need the user, but should only hit the session table once.
const getSession = cache(() => auth());

async function currentLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("NEXT_LOCALE")?.value;
  return (locales as readonly string[]).includes(v ?? "") ? (v as Locale) : defaultLocale;
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    const locale = await currentLocale();
    redirect(`/${locale}/signin`);
  }
  if (session.user.banned) {
    const locale = await currentLocale();
    redirect(`/${locale}/banned`);
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    const locale = await currentLocale();
    redirect(`/${locale}`);
  }
  return user;
}

export async function getOptionalUser() {
  const session = await getSession();
  return session?.user ?? null;
}
