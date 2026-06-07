import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { isOwner } from "@/lib/types";

async function requireAdmin(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return { error: blocked };
  const session = await auth();
  if (!session?.user || !isOwner(session.user.role) || session.user.banned)
    return { error: new NextResponse("Forbidden", { status: 403 }) };
  const limited = rateLimitBlock(`admin-website-request:${session.user.id}`, 60, 60_000);
  if (limited) return { error: limited };
  return { error: null };
}

// Flip a lead between NEW and HANDLED.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await ctx.params;
  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }
  if (body.status !== "NEW" && body.status !== "HANDLED") {
    return new NextResponse("Invalid status", { status: 400 });
  }

  try {
    await prisma.websiteRequest.update({ where: { id }, data: { status: body.status } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await ctx.params;
  try {
    await prisma.websiteRequest.delete({ where: { id } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
