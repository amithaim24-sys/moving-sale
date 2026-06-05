export type Role = "USER" | "ADMIN";
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
