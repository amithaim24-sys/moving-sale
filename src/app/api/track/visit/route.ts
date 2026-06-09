import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitBlock, clientIp, isSameOrigin } from "@/lib/security";
import { storeSlugFromPath } from "@/lib/stores";

// Beacon endpoint — receives a fire-and-forget POST from VisitTracker on every
// tab session entry. It writes only an anonymous analytics row (no state change
// visible to the caller). We require same-origin and rate-limit on BOTH the vid
// cookie and the client IP, so a scripted client can't bypass the per-visitor cap
// by sending a fresh random vid on every request and flooding the visits table.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new NextResponse(null, { status: 204 });

  const vid = (await cookies()).get("vid")?.value;

  // The vid bucket throttles a normal visitor; the IP bucket (looser, to tolerate
  // shared NATs) catches a client that rotates the cookie to dodge the vid bucket.
  const limited =
    rateLimitBlock(`visit:${vid ?? "anon"}`, 30, 60_000) ||
    rateLimitBlock(`visit-ip:${clientIp(req)}`, 120, 60_000);
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
