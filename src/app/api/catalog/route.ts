import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { fetchCatalogPage } from "@/lib/catalog";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/types";

// Paginated catalog feed for infinite scroll. The first page is rendered
// server-side by CatalogView; the client fetches subsequent pages here.
// Only AVAILABLE items are returned and everything is scoped by `storeId`, so
// this exposes nothing the catalog pages don't already render publicly. The
// owner's phone is reduced to a boolean upstream; whether it's shown is decided
// from the viewer's auth state, not from the client-supplied params.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const storeId = searchParams.get("storeId") || null;
  const typeParam = searchParams.get("type");
  const type = typeParam === "SELL" || typeParam === "GIVE" ? typeParam : undefined;
  const categoryParam = searchParams.get("category") ?? "";
  const category = ITEM_CATEGORIES.includes(categoryParam as ItemCategory)
    ? (categoryParam as ItemCategory)
    : undefined;
  const q = searchParams.get("q")?.trim().slice(0, 100) || undefined;
  const page = Math.min(Math.max(Number.parseInt(searchParams.get("page") ?? "0", 10) || 0, 0), 1000);

  const { items, hasMore } = await fetchCatalogPage({ storeId, type, category, q }, page);

  const user = await getOptionalUser();
  const likedIds = user
    ? (
        await prisma.itemLike.findMany({
          where: { userId: user.id, itemId: { in: items.map((i) => i.id) } },
          select: { itemId: true },
        })
      ).map((l) => l.itemId)
    : [];

  return NextResponse.json({ items, likedIds, hasMore });
}
