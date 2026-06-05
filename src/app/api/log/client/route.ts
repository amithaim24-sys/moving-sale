import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, isSameOrigin } from "@/lib/security";
import { logEvent, requestContext, type LogLevel } from "@/lib/eventLog";

// Ingest endpoint for client-side telemetry (button clicks, JS errors, popup
// blocks). This is how we capture problems that never reach the server at all —
// e.g. a WhatsApp click where the new tab was blocked, so the contact route is
// never hit. Locked down: same-origin only, IP rate-limited, and the accepted
// event names are an explicit allow-list so it can't be used as a free-form
// write primitive against our log table.

const ALLOWED_EVENTS = new Set([
  "client_whatsapp_click",
  "client_whatsapp_blocked",
  "client_error",
]);

const ALLOWED_LEVELS = new Set<LogLevel>(["INFO", "WARN", "ERROR"]);

export async function POST(req: Request) {
  // Browser telemetry should only come from our own pages.
  if (!isSameOrigin(req)) {
    return new NextResponse(null, { status: 204 });
  }

  const reqCtx = requestContext(req);

  // Cheap abuse guard keyed on best-effort IP. We deliberately return 204 (not
  // 429) so a misbehaving client never retries in a loop on our telemetry path.
  if (!rateLimit(`clientlog:${reqCtx.ip ?? "unknown"}`, 60, 60_000)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const event = typeof b.event === "string" ? b.event : "";
  if (!ALLOWED_EVENTS.has(event)) {
    return new NextResponse(null, { status: 204 });
  }

  const level: LogLevel =
    typeof b.level === "string" && ALLOWED_LEVELS.has(b.level as LogLevel)
      ? (b.level as LogLevel)
      : "INFO";

  // Attribute to the signed-in user when we can; clients can't spoof this.
  const session = await auth();

  await logEvent({
    event,
    outcome: typeof b.outcome === "string" ? b.outcome : "client",
    level,
    message: typeof b.message === "string" ? b.message : undefined,
    itemId: typeof b.itemId === "string" ? b.itemId : undefined,
    userId: session?.user?.id ?? null,
    path: typeof b.path === "string" ? b.path : reqCtx.path,
    userAgent: reqCtx.userAgent,
    ip: reqCtx.ip,
    meta: {
      referer: reqCtx.referer,
      // Keep only a small, known set of client-supplied fields.
      ...(typeof b.meta === "object" && b.meta ? (b.meta as Record<string, unknown>) : {}),
    },
  });

  return new NextResponse(null, { status: 204 });
}
