import type { ItemCondition, ListingStatus, ListingType } from "./types";

export type ItemPayload = {
  title: string;
  description: string;
  type: ListingType;
  condition: ItemCondition | null;
  priceIls: number | null;
  status?: ListingStatus;
  images?: { cloudinaryPublicId: string; url: string }[];
};

export function parseItemPayload(raw: unknown, partial = false): Partial<ItemPayload> {
  if (!raw || typeof raw !== "object") throw new Error("Invalid body");
  const b = raw as Record<string, unknown>;
  const out: Partial<ItemPayload> = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim() === "") throw new Error("Title required");
    out.title = b.title.trim().slice(0, 120);
  } else if (!partial) throw new Error("Title required");

  if (b.description !== undefined) {
    if (typeof b.description !== "string") throw new Error("Bad description");
    out.description = b.description.trim().slice(0, 4000);
  }

  if (b.type !== undefined) {
    if (b.type !== "SELL" && b.type !== "GIVE") throw new Error("Bad type");
    out.type = b.type;
  } else if (!partial) throw new Error("Type required");

  if (b.priceIls !== undefined) {
    if (b.priceIls === null) out.priceIls = null;
    else {
      const n = Number(b.priceIls);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new Error("Bad price");
      out.priceIls = Math.round(n);
    }
  }
  if (out.type === "GIVE") out.priceIls = null;

  if (b.condition !== undefined) {
    if (b.condition === null || b.condition === "") {
      out.condition = null;
    } else if (["NEW", "LIKE_NEW", "USED"].includes(b.condition as string)) {
      out.condition = b.condition as ItemCondition;
    } else {
      throw new Error("Bad condition");
    }
  }

  if (b.status !== undefined) {
    if (!["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "HIDDEN"].includes(b.status as string))
      throw new Error("Bad status");
    out.status = b.status as ListingStatus;
  }

  if (b.images !== undefined) {
    if (!Array.isArray(b.images)) throw new Error("Bad images");
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const folder = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "moving-sale";
    if (!cloud) throw new Error("Cloudinary not configured");
    const urlPrefix = `https://res.cloudinary.com/${cloud}/image/upload/`;
    out.images = b.images.slice(0, 10).map((img) => {
      const x = img as { cloudinaryPublicId?: unknown; url?: unknown };
      if (typeof x.cloudinaryPublicId !== "string" || typeof x.url !== "string")
        throw new Error("Bad image entry");
      if (!x.url.startsWith(urlPrefix)) throw new Error("Image URL must be in our Cloudinary account");
      if (!x.cloudinaryPublicId.startsWith(`${folder}/`))
        throw new Error("Image publicId must be inside our upload folder");
      return { cloudinaryPublicId: x.cloudinaryPublicId, url: x.url };
    });
  }

  return out;
}
