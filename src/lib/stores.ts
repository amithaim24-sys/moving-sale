import { cache } from "react";
import { prisma } from "./prisma";

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
