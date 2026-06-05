"use client";

import { useEffect } from "react";
import { logClientEvent } from "@/lib/clientLog";

// Mounted once in the locale layout, so it covers every page. Captures the two
// classes of client-side failure the server can never see on its own:
//   - uncaught runtime errors  (window "error")
//   - unhandled promise rejections  (window "unhandledrejection")
// Both are beaconed to /api/log/client and show up in the admin log viewer.
//
// Capped per page-session so a tight error loop can't flood the log endpoint.
export default function ClientErrorLogger() {
  useEffect(() => {
    let sent = 0;
    const MAX = 15;

    const onError = (e: ErrorEvent) => {
      if (sent++ >= MAX) return;
      logClientEvent({
        event: "client_error",
        level: "ERROR",
        outcome: "window_error",
        message: e.message || "Uncaught error",
        meta: {
          source: e.filename,
          line: e.lineno,
          col: e.colno,
          stack: e.error?.stack?.slice(0, 2000),
        },
      });
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (sent++ >= MAX) return;
      const reason = e.reason as { message?: string; stack?: string } | undefined;
      logClientEvent({
        event: "client_error",
        level: "ERROR",
        outcome: "unhandled_rejection",
        message: reason?.message ?? String(e.reason),
        meta: { stack: reason?.stack?.slice(0, 2000) },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
