import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { logEvent, requestContext } from "@/lib/eventLog";

// Public endpoint: a visitor asks to get a copy of this website for themselves.
// No account is required (most visitors are anonymous), so we identify rate-limit
// buckets by the proxy-provided client IP and just record the lead for the admin.
export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimitBlock(`website-request:${ip}`, 5, 60_000);
  if (limited) return limited;

  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@") || email.length > 200) {
    return new NextResponse("A valid email is required", { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || null : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) || null : null;

  // If the requester happens to be signed in, tag the lead with their user id.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  await prisma.websiteRequest.create({
    data: { name, email, message, userId },
  });

  const ctx = requestContext(req);
  void logEvent({
    event: "website_request",
    outcome: "ok",
    userId,
    path: ctx.path,
    userAgent: ctx.userAgent,
    ip: ctx.ip,
    meta: { hasName: !!name, hasMessage: !!message },
  });
  return NextResponse.json({ ok: true });
}
