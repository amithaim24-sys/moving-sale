"use client";

import { useEffect } from "react";
import { logClientEvent } from "@/lib/clientLog";

// Last-resort boundary: replaces the root layout, so it ships its own <html>
// and inline styles (no Tailwind / i18n provider available here).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // A root crash is the most severe case — make sure it's recorded.
    logClientEvent({
      event: "client_error",
      level: "ERROR",
      outcome: "global_error_boundary",
      message: error.message,
      meta: { digest: error.digest, stack: error.stack?.slice(0, 2000) },
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <div style={{ fontSize: "3rem" }}>😵</div>
          <h1 style={{ fontSize: "1.25rem", margin: "0.5rem 0" }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", color: "#475569" }}>Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              background: "#0f766e",
              color: "#fff",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
