import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitBlock } from "@/lib/security";
import { storeSlugFromPath } from "@/lib/stores";

// Beacon endpoint — receives a fire-and-forget POST from VisitTracker on every
// tab session entry. No CSRF check needed: this endpoint writes only an anonymous
// analytics row (no state change visible to the caller) and is rate-limited per vid.
export async function POST(req: Request) {
  const vid = (await cookies()).get("vid")?.value;

  // Rate-limit per visitor id to prevent a single client from flooding the visits table.
  const limited = rateLimitBlock(`visit:${vid ?? "anon"}`, 30, 60_000);
  if (limited) return limited;

  const session = await auth();

  let path = "/";
  try {
    const body = await req.json() as { path?: unknown };
    if (typeof body.path === "string" && body.path.length > 0) {
      // Cap length so a crafted client can't bloat the row with a giant path.
      path = body.path.slice(0, 512);
    }
  } catch {
    // Malformed or empty body — default path "/" is fine.
  }

  // Attribute the visit to a store when the path is a store route, so the store's
  // own admin dashboard can count its traffic (null = main site).
  let storeId: string | null = null;
  const slug = storeSlugFromPath(path);
  if (slug) {
    storeId = (await prisma.store.findUnique({ where: { slug }, select: { id: true } }).catch(() => null))?.id ?? null;
  }

  await prisma.visit
    .create({
      data: {
        visitorId: vid ?? "anon",
        userId: session?.user?.id ?? null,
        storeId,
        path,
      },
    })
    .catch(() => {});

  return new NextResponse(null, { status: 204 });
}
