import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { isValidSlug, uniqueSlug } from "@/lib/stores";
import { isOwner } from "@/lib/types";

async function guard(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return { error: blocked, session: null };
  const session = await auth();
  if (!session?.user || !isOwner(session.user.role) || session.user.banned)
    return { error: new NextResponse("Forbidden", { status: 403 }), session: null };
  const limited = rateLimitBlock(`admin-stores:${session.user.id}`, 60, 60_000);
  if (limited) return { error: limited, session: null };
  return { error: null, session };
}

// Create a white-label store and hand it to an existing user. The owner is matched
// by email (they must have signed in at least once so an account exists). On
// creation, any items that user already posted are moved into the new store so the
// catalog reflects "their stuff" immediately.
export async function POST(req: Request) {
  const { error } = await guard(req);
  if (error) return error;

  let body: { name?: unknown; ownerEmail?: unknown; slug?: unknown; tagline?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const tagline =
    typeof body.tagline === "string" && body.tagline.trim()
      ? body.tagline.trim().slice(0, 160)
      : null;
  const rawSlug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";

  if (!name) return new NextResponse("Store name is required", { status: 400 });
  if (!ownerEmail) return new NextResponse("Owner email is required", { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return new NextResponse("Enter a valid owner email", { status: 400 });
  }

  // Find the owner's account, or pre-provision a placeholder one. The owner does NOT
  // need to have signed in yet: we create a user row keyed by their email, and their
  // first Google sign-in links to it (allowDangerousEmailAccountLinking in lib/auth).
  const existing = await prisma.user.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
    select: { id: true, store: { select: { id: true } } },
  });
  if (existing?.store) {
    return new NextResponse("That user already owns a store", { status: 409 });
  }
  const ownerId =
    existing?.id ??
    (await prisma.user.create({ data: { email: ownerEmail }, select: { id: true } })).id;

  // Resolve the slug: use the admin-supplied one (validated) or derive a unique one
  // from the name.
  let slug: string;
  if (rawSlug) {
    if (!isValidSlug(rawSlug)) {
      return new NextResponse("Slug must be 1–40 chars: lowercase letters, numbers, hyphens", { status: 400 });
    }
    const taken = await prisma.store.findUnique({ where: { slug: rawSlug }, select: { id: true } });
    if (taken) return new NextResponse("That link is already taken", { status: 409 });
    slug = rawSlug;
  } else {
    slug = await uniqueSlug(name);
  }

  try {
    const store = await prisma.$transaction(async (tx) => {
      const created = await tx.store.create({
        data: { name, slug, tagline, ownerId },
        select: { id: true, slug: true },
      });
      // The owner is the store's admin member.
      await tx.storeMembership.create({
        data: { storeId: created.id, userId: ownerId, role: "ADMIN" },
      });
      // Move the owner's existing listings into their new store (none yet for a
      // freshly provisioned placeholder owner).
      await tx.item.updateMany({ where: { ownerId }, data: { storeId: created.id } });
      return created;
    });
    return NextResponse.json({ id: store.id, slug: store.slug });
  } catch {
    return new NextResponse("Could not create store", { status: 500 });
  }
}
