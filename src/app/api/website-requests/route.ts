import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock, clientIp } from "@/lib/security";
import { logEvent, requestContext } from "@/lib/eventLog";

// Matches the email shape we accept elsewhere (a local part, an @, and a dotted
// domain) — stricter than a bare "@" check so the leads table isn't flooded with
// obvious junk addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public endpoint: a visitor asks to get a copy of this website for themselves.
// No account is required (most visitors are anonymous), so we identify rate-limit
// buckets by the proxy-provided client IP and just record the lead for the admin.
export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;

  const ip = clientIp(req);
  const limited = rateLimitBlock(`website-request:${ip}`, 5, 60_000);
  if (limited) return limited;

  let body: { name?: unknown; email?: unknown; phone?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return new NextResponse("A valid email is required", { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || null : null;
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) || null : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) || null : null;

  // If the requester happens to be signed in, tag the lead with their user id.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  await prisma.websiteRequest.create({
    data: { name, email, phone, message, userId },
  });

  const ctx = requestContext(req);
  void logEvent({
    event: "website_request",
    outcome: "ok",
    userId,
    path: ctx.path,
    userAgent: ctx.userAgent,
    ip: ctx.ip,
    meta: { hasName: !!name, hasPhone: !!phone, hasMessage: !!message },
  });
  return NextResponse.json({ ok: true });
}
