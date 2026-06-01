"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Toast = { id: number; message: string; kind: "success" | "error" };
type ToastCtx = { show: (message: string, kind?: Toast["kind"]) => void };

const Ctx = createContext<ToastCtx | null>(null);

// Errors linger longer than confirmations: a failed save is something the user must read
// and act on, whereas a success is reassurance they can glance at and ignore.
const DURATION: Record<Toast["kind"], number> = { success: 3000, error: 6000 };

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <Toaster>");
  return v;
}

export default function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const t = useTranslations("a11y");
  const isError = toast.kind === "error";

  useEffect(() => {
    const id = setTimeout(onDone, DURATION[toast.kind]);
    return () => clearTimeout(id);
  }, [onDone, toast.kind]);

  const color = isError ? "bg-red-600 text-white" : "bg-emerald-600 text-white";

  return (
    <div
      // Errors interrupt (assertive); successes wait their turn (polite). Each toast owns its
      // own live region so screen readers announce it as a complete, self-contained message.
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-full py-2 ps-4 pe-2 text-sm font-medium shadow-lg ${color}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isError ? (
          <path d="M12 8v5m0 3h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z" />
        ) : (
          <path d="m5 13 4 4L19 7" />
        )}
      </svg>
      <span className="min-w-0 break-words">{toast.message}</span>
      <button
        type="button"
        onClick={onDone}
        aria-label={t("closeDialog")}
        title={t("closeDialog")}
        className="-me-1 ms-auto inline-flex h-6 min-h-0 w-6 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
