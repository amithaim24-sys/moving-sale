import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { isValidSlug } from "@/lib/stores";
import { isOwner } from "@/lib/types";

async function guard(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return { error: blocked };
  const session = await auth();
  if (!session?.user || !isOwner(session.user.role) || session.user.banned)
    return { error: new NextResponse("Forbidden", { status: 403 }) };
  const limited = rateLimitBlock(`admin-stores:${session.user.id}`, 60, 60_000);
  if (limited) return { error: limited };
  return { error: null };
}

// Update a store: rename, change tagline, toggle active, or change its public slug.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await guard(req);
  if (error) return error;
  const { id } = await ctx.params;

  let body: { name?: unknown; tagline?: unknown; active?: unknown; slug?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const data: { name?: string; tagline?: string | null; active?: boolean; slug?: string } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim())
      return new NextResponse("Bad name", { status: 400 });
    data.name = body.name.trim().slice(0, 80);
  }
  if (body.tagline !== undefined) {
    if (body.tagline === null || body.tagline === "") data.tagline = null;
    else if (typeof body.tagline === "string") data.tagline = body.tagline.trim().slice(0, 160);
    else return new NextResponse("Bad tagline", { status: 400 });
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return new NextResponse("Bad active", { status: 400 });
    data.active = body.active;
  }
  if (body.slug !== undefined) {
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!isValidSlug(slug)) return new NextResponse("Bad slug", { status: 400 });
    const taken = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
    if (taken && taken.id !== id) return new NextResponse("That link is already taken", { status: 409 });
    data.slug = slug;
  }

  if (Object.keys(data).length === 0) return new NextResponse("Nothing to update", { status: 400 });

  try {
    await prisma.store.update({ where: { id }, data });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Delete a store. Its items are NOT deleted — the FK is ON DELETE SET NULL, so the
// owner's listings simply return to the root catalog.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await guard(req);
  if (error) return error;
  const { id } = await ctx.params;
  try {
    await prisma.store.delete({ where: { id } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
