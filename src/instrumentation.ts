// Next.js instrumentation. `onRequestError` is a framework hook fired for EVERY
// uncaught server-side error anywhere in the app — route handlers, Server
// Components, SSR, and Server Actions. This is the single choke point that gives
// us whole-site server error logging without touching each route individually.
//
// It can run in either the Node.js or the Edge runtime; Prisma only works under
// Node, so we no-op on Edge (middleware errors there are rare and the DB isn't
// reachable). Everything is wrapped so logging can never mask the original error.

import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    // Imported lazily so the Edge runtime never tries to bundle Prisma.
    const { logEvent } = await import("@/lib/eventLog");
    const e = err as (Error & { digest?: string }) | undefined;
    await logEvent({
      event: "server_error",
      // routeType is "route" | "render" | "action" | "middleware" — i.e. which
      // kind of server work blew up.
      outcome: context?.routeType ?? "unknown",
      level: "ERROR",
      message: e?.message ?? String(err),
      path: request?.path ?? null,
      meta: {
        method: request?.method ?? null,
        routePath: context?.routePath ?? null,
        routerKind: context?.routerKind ?? null,
        renderSource: context?.renderSource ?? null,
        digest: e?.digest ?? null,
        stack: e?.stack ? e.stack.slice(0, 4000) : null,
      },
    });
  } catch {
    // Never let the logger throw out of the error hook.
  }
};
