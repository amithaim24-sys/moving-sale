import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { isOwner } from "@/lib/types";

export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user || !isOwner(session.user.role) || session.user.banned)
    return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`admin-promote-all:${session.user.id}`, 5, 60_000);
  if (limited) return limited;

  // Collect IDs first so we can precisely invalidate only the promoted users' sessions.
  const targets = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true },
  });

  if (targets.length === 0) return NextResponse.json({ count: 0 });

  const ids = targets.map((u) => u.id);

  await prisma.$transaction([
    prisma.user.updateMany({ where: { id: { in: ids } }, data: { role: "SELLER" } }),
    prisma.session.deleteMany({ where: { userId: { in: ids } } }),
  ]);

  return NextResponse.json({ count: ids.length });
}
