"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminItemActions({
  id,
  hidden,
  labels,
}: {
  id: string;
  hidden: boolean;
  labels: { hide: string; show: string; delete: string; confirmDelete: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: hidden ? "AVAILABLE" : "HIDDEN" }),
      });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || "Action failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(labels.confirmDelete)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || "Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button onClick={toggle} disabled={busy} className="btn-secondary text-xs">
          {hidden ? labels.show : labels.hide}
        </button>
        <button onClick={remove} disabled={busy} className="btn-danger text-xs">
          {labels.delete}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
