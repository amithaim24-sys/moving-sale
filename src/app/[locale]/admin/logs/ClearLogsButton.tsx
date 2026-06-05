"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Housekeeping button: deletes log rows older than the server-defined retention
// window so the table doesn't grow without bound. Confirms before deleting.
export default function ClearLogsButton({
  label,
  confirmText,
  doneText,
}: {
  label: string;
  confirmText: string;
  doneText: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<number | null>(null);

  async function handleClick() {
    if (!confirm(confirmText)) return;
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      if (!res.ok) return;
      const data = (await res.json()) as { deleted?: number };
      setDone(data.deleted ?? 0);
      startTransition(() => router.refresh());
    } catch {
      // Surface nothing — this is a best-effort maintenance action.
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
    >
      {done !== null ? doneText.replace("{count}", String(done)) : label}
    </button>
  );
}
