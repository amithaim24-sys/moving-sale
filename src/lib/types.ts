export type Role = "USER" | "ADMIN";
export type ListingType = "SELL" | "GIVE";
export type ListingStatus = "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";

export const LISTING_TYPES: ListingType[] = ["SELL", "GIVE"];
export const LISTING_STATUSES: ListingStatus[] = ["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "HIDDEN"];

export const DEFAULT_PHONE_PREFIX = "+972";
