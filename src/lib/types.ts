// Platform roles (the global account role, distinct from per-store membership roles):
// - OWNER: the main owner / super-admin. Full access, incl. bugs/issues (logs),
//   stores, and site-requests. There is always at least one.
// - ADMIN: a delegated admin who controls Users, Items and Analytics only.
// - USER: a normal user.
export type Role = "USER" | "ADMIN" | "OWNER";

// Has elevated platform powers used across the app (view hidden/draft listings,
// edit/delete any item, contact any seller, see an admin panel). Both the owner and
// a delegated admin qualify.
export function isPlatformAdmin(role?: string | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// The main owner / super-admin only (bugs & issues, stores, site-requests).
export function isOwner(role?: string | null): boolean {
  return role === "OWNER";
}

// Admin sections and who may access each. Owner sees all; a delegated admin sees
// only users / items / analytics.
export type AdminSection = "analytics" | "users" | "items" | "logs" | "stores" | "requests";
export function canAccessSection(role: string | null | undefined, section: AdminSection): boolean {
  if (isOwner(role)) return true;
  if (role === "ADMIN") return section === "analytics" || section === "users" || section === "items";
  return false;
}

export type ListingType = "SELL" | "GIVE";
export type ListingStatus = "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";
export type ItemCondition = "NEW" | "LIKE_NEW" | "USED";

// Optional listing category. Kept as a fixed, small set so it can power filtering
// and stay translatable; `null` on an item means the seller left it unset.
export type ItemCategory =
  | "FURNITURE"
  | "APPLIANCES"
  | "KITCHEN"
  | "ELECTRONICS"
  | "HOME"
  | "BABY_KIDS"
  | "TOYS_GAMES"
  | "CLOTHING"
  | "SPORTS"
  | "TOOLS_GARDEN"
  | "BOOKS_MEDIA"
  | "BEAUTY"
  | "OTHER";

export const LISTING_TYPES: ListingType[] = ["SELL", "GIVE"];
export const LISTING_STATUSES: ListingStatus[] = ["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "HIDDEN"];
export const ITEM_CONDITIONS: ItemCondition[] = ["NEW", "LIKE_NEW", "USED"];
export const ITEM_CATEGORIES: ItemCategory[] = [
  "FURNITURE",
  "APPLIANCES",
  "KITCHEN",
  "ELECTRONICS",
  "HOME",
  "BABY_KIDS",
  "TOYS_GAMES",
  "CLOTHING",
  "SPORTS",
  "TOOLS_GARDEN",
  "BOOKS_MEDIA",
  "BEAUTY",
  "OTHER",
];

export const DEFAULT_PHONE_PREFIX = "+972";
