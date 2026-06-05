// Tiny client-side telemetry helper. Posts to /api/log/client, which validates
// and persists the event to the same EventLog the admin reads. Use this from
// "use client" components to capture things the server can never see on its own
// (clicks, popup blocks, runtime JS errors).
//
// It is intentionally best-effort and never throws: telemetry must not break UX.

type ClientLogInput = {
  event: "client_whatsapp_click" | "client_whatsapp_blocked" | "client_error";
  outcome?: string;
  level?: "INFO" | "WARN" | "ERROR";
  message?: string;
  itemId?: string;
  meta?: Record<string, unknown>;
};

export function logClientEvent(input: ClientLogInput): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      ...input,
      path: window.location.pathname,
    });

    // sendBeacon survives the page being navigated away / a new tab opening,
    // which is exactly the moment a WhatsApp click fires. Fall back to fetch
    // with keepalive where Beacon is unavailable.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/log/client", blob);
      return;
    }
    void fetch("/api/log/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow — telemetry is never allowed to surface to the user.
  }
}
