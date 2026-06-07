import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { locales } from "@/i18n/config";

// White-label store helpers. A `Store` is a tenant carved out of the same app:
// its public catalog lives at `/<locale>/s/<slug>` and shows only items whose
// `storeId` points at it. A `null` Item.storeId means the root/primary catalog.

// The store this user owns and self-manages, if any (at most one). Cached per
// request — the header, /my pages, and the item-create path all ask for it.
export const getOwnedStore = cache((userId: string) =>
  prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, slug: true, name: true, active: true },
  }),
);

// Extract the store slug from a path like `/en/s/dana` or `/s/dana/...`.
// Returns null for non-store paths. Tolerates an optional leading locale segment.
export function storeSlugFromPath(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean);
  let i = 0;
  if (segs[i] && (locales as readonly string[]).includes(segs[i])) i++;
  if (segs[i] === "s" && segs[i + 1]) return segs[i + 1];
  return null;
}

// The store for the CURRENT request, derived from the `x-pathname` header set in
// middleware. Returns null on the main site. Cached per request so the layout,
// header, and page share one lookup.
export const getCurrentStore = cache(async () => {
  const h = await headers();
  const path = h.get("x-pathname");
  if (!path) return null;
  const slug = storeSlugFromPath(path);
  if (!slug) return null;
  return getStoreBySlug(slug);
});

// Look up a store by its public slug (for the `/s/<slug>` catalog).
export const getStoreBySlug = cache((slug: string) =>
  prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      active: true,
      ownerId: true,
    },
  }),
);

// Ensure a signed-in user is a member of a store (idempotent). Called from buyer
// engagement (e.g. liking a store item) so each store's user list reflects who
// actually interacts with it. No-op for main-site items (pass a real storeId only).
export async function ensureMembership(storeId: string, userId: string): Promise<void> {
  await prisma.storeMembership
    .upsert({
      where: { storeId_userId: { storeId, userId } },
      create: { storeId, userId, role: "MEMBER" },
      update: {},
    })
    .catch(() => {});
}

// Normalize a free-text store name into a URL-safe slug. Latin-only: strips
// accents and non-alphanumerics, collapses to kebab-case. Hebrew/other scripts
// fall back to empty, so the admin must supply an explicit slug in that case.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Reserved first path segments that must never be claimed as a store slug, or the
// store catalog would shadow a real route. (`/s/admin`, `/s/my`, etc.)
const RESERVED_SLUGS = new Set([
  "admin",
  "my",
  "api",
  "items",
  "signin",
  "banned",
  "s",
  "new",
  "edit",
]);

export function isValidSlug(slug: string): boolean {
  // 1–40 chars, lowercase alphanumeric + internal hyphens, no leading/trailing hyphen.
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

// Find a free slug derived from `base`, appending -2, -3, … on collision.
export async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "store";
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (!isValidSlug(candidate)) continue;
    const existing = await prisma.store.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  // Astronomically unlikely; keep the type honest.
  throw new Error("Could not allocate a unique slug");
}
