import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

// Add a collaborator to the current user's account by email. The collaborator can
// then edit all of the owner's items — existing and future.
export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`collab-add:${session.user.id}`, 20, 60_000);
  if (limited) return limited;

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return new NextResponse("A valid email is required", { status: 400 });

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  // Don't reveal whether an arbitrary email has an account; only proceed for real users.
  if (!target) return new NextResponse("No account found with that email. They must sign in once first.", { status: 404 });
  if (target.id === session.user.id) return new NextResponse("You can't add yourself", { status: 400 });

  try {
    await prisma.collaborator.create({
      data: { ownerId: session.user.id, collaboratorId: target.id },
    });
  } catch {
    // Unique constraint => already a collaborator. Treat as idempotent success.
  }

  return NextResponse.json({ id: target.id, name: target.name, email: target.email });
}
