import { prisma } from "@/lib/prisma";

// Structured, append-only application event log used to debug real user issues
// in production (e.g. "the WhatsApp button did nothing for me"). Every write is
// fire-and-forget: a logging failure must never block or break the request it is
// describing, so all errors are swallowed.
//
// Read these back in the admin panel at /[locale]/admin/logs.

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogInput = {
  event: string;
  outcome?: string;
  level?: LogLevel;
  message?: string;
  itemId?: string | null;
  userId?: string | null;
  path?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  // Anything else worth keeping — referer, request URL, error stack, etc.
  meta?: Record<string, unknown> | null;
};

// Truncate long free-text so a single rogue value can't bloat a row.
function clamp(v: string | null | undefined, max: number): string | null {
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

// Pull the useful debugging context out of an incoming Request: which UA, where
// the click came from, and a best-effort client IP (behind Vercel's proxy).
export function requestContext(req: Request): {
  userAgent: string | null;
  ip: string | null;
  path: string | null;
  referer: string | null;
} {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  let path: string | null = null;
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = null;
  }
  return {
    userAgent: h.get("user-agent"),
    ip,
    path,
    referer: h.get("referer"),
  };
}

// Write one log row. Returns a promise you can `await` if you want the row
// persisted before responding, but it never rejects.
export async function logEvent(input: LogInput): Promise<void> {
  try {
    await prisma.eventLog.create({
      data: {
        event: clamp(input.event, 100) ?? "unknown",
        outcome: clamp(input.outcome, 100),
        level: input.level ?? "INFO",
        message: clamp(input.message, 1000),
        itemId: clamp(input.itemId, 64),
        userId: clamp(input.userId, 64),
        path: clamp(input.path, 500),
        userAgent: clamp(input.userAgent, 500),
        ip: clamp(input.ip, 64),
        meta: (input.meta ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    // Last resort: surface to the server console but never throw.
    console.error("[eventLog] failed to write log", err);
  }
}
