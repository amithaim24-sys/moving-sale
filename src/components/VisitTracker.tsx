"use client";

import { useEffect } from "react";

// Fires a single visit beacon per tab session (guarded by sessionStorage so
// navigating between pages doesn't re-send). Uses sendBeacon when available so
// the request survives page unload; falls back to fetch with keepalive.
export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem("visit-tracked")) return;
    sessionStorage.setItem("visit-tracked", "1");

    const body = JSON.stringify({ path: location.pathname });
    const url = "/api/track/visit";
    const opts: RequestInit = {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    };

    // sendBeacon can refuse the payload (returns false) — fall back to fetch so the
    // visit isn't silently dropped after the sessionStorage guard is already set.
    const sent =
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    if (!sent) {
      fetch(url, opts).catch(() => {});
    }
  }, []);

  return null;
}
