import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

// How long event logs are kept. The "clear" button purges anything older.
const RETENTION_DAYS = 30;

async function requireAdmin(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return { error: blocked };
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || session.user.banned)
    return { error: new NextResponse("Forbidden", { status: 403 }) };
  const limited = rateLimitBlock(`admin-logs:${session.user.id}`, 30, 60_000);
  if (limited) return { error: limited };
  return { error: null };
}

// Housekeeping: delete event-log rows older than the retention window.
export async function DELETE(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const { count } = await prisma.eventLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return NextResponse.json({ deleted: count });
  } catch {
    return new NextResponse("Failed to clear logs", { status: 500 });
  }
}
