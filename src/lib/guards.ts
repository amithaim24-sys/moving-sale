import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { isOwner, isPlatformAdmin } from "./types";
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

// Any platform admin (OWNER or delegated ADMIN). Gates the shared admin sections
// (dashboard, users, items, analytics).
export async function requireAdmin() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.role)) {
    const locale = await currentLocale();
    redirect(`/${locale}`);
  }
  return user;
}

// The main owner only. Gates owner-exclusive sections (logs/bugs, stores, requests).
export async function requireOwner() {
  const user = await requireUser();
  if (!isOwner(user.role)) {
    const locale = await currentLocale();
    redirect(`/${locale}`);
  }
  return user;
}

export async function getOptionalUser() {
  const session = await getSession();
  return session?.user ?? null;
}

// ---------------------------------------------------------------------------
// Store-scoped identity (separate users per store).
//
// The same signed-in User is a distinct "member" in each store, via StoreMembership.
// These helpers resolve that membership for the CURRENT store and are used by the
// store subtree (/[locale]/s/[slug]/...). The main-site guards above are unchanged.
// ---------------------------------------------------------------------------

export type StoreMembershipView = {
  id: string;
  role: string; // "MEMBER" | "ADMIN"
  banned: boolean;
  displayName: string | null;
  whatsappPhone: string | null;
  city: string | null;
};
export type StoreViewer = {
  user: NonNullable<Awaited<ReturnType<typeof getOptionalUser>>>;
  membership: StoreMembershipView;
  isStoreAdmin: boolean;
};

const MEMBERSHIP_SELECT = {
  id: true,
  role: true,
  banned: true,
  displayName: true,
  whatsappPhone: true,
  city: true,
} as const;

// The current user's identity within a store, or null if not signed in / store-banned.
// Lazily creates a MEMBER membership the first time a normal signed-in user acts in
// the store (the super-admin is treated as a store admin WITHOUT creating a row, so
// the platform owner doesn't clutter each store's user list).
export async function getStoreViewer(storeId: string): Promise<StoreViewer | null> {
  const session = await getSession();
  const user = session?.user;
  if (!user) return null;
  // A globally-banned account is locked out everywhere.
  if (user.banned) return null;

  let membership = await prisma.storeMembership.findUnique({
    where: { storeId_userId: { storeId, userId: user.id } },
    select: MEMBERSHIP_SELECT,
  });

  if (!membership) {
    if (isOwner(user.role)) {
      // The platform owner previews any store without becoming a listed member.
      return {
        user,
        membership: { id: "super-admin", role: "ADMIN", banned: false, displayName: null, whatsappPhone: null, city: null },
        isStoreAdmin: true,
      };
    }
    membership = await prisma.storeMembership.create({
      data: { storeId, userId: user.id, role: "MEMBER" },
      select: MEMBERSHIP_SELECT,
    });
  }

  // Banned from THIS store → treated as logged out for the store.
  if (membership.banned) return null;

  return { user, membership, isStoreAdmin: membership.role === "ADMIN" || isOwner(user.role) };
}

// Require a signed-in store member; otherwise send to the store-aware sign-in.
export async function requireStoreMember(storeId: string, slug: string): Promise<StoreViewer> {
  const viewer = await getStoreViewer(storeId);
  if (!viewer) {
    const locale = await currentLocale();
    const base = `/${locale}/s/${slug}`;
    redirect(`/${locale}/signin?callbackUrl=${encodeURIComponent(base)}`);
  }
  return viewer;
}

// Require store-admin (the owner / a store ADMIN, or the platform super-admin).
export async function requireStoreAdmin(storeId: string, slug: string): Promise<StoreViewer> {
  const viewer = await requireStoreMember(storeId, slug);
  if (!viewer.isStoreAdmin) {
    const locale = await currentLocale();
    redirect(`/${locale}/s/${slug}`);
  }
  return viewer;
}
