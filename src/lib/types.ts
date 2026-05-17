export type Role = "USER" | "ADMIN";
export type ListingType = "SELL" | "GIVE";
export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";

export const LISTING_TYPES: ListingType[] = ["SELL", "GIVE"];
export const LISTING_STATUSES: ListingStatus[] = ["AVAILABLE", "RESERVED", "SOLD", "HIDDEN"];
