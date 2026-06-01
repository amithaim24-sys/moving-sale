"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MyItemActions({
  id,
  editHref,
  isSold,
  labels,
}: {
  id: string;
  editHref: string;
  isSold: boolean;
  labels: {
    edit: string;
    markSold: string;
    markAvailable: string;
    delete: string;
    confirmDelete: string;
    actionFailed: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSold() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isSold ? "AVAILABLE" : "SOLD" }),
      });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || labels.actionFailed);
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
        setError((await res.text().catch(() => "")) || labels.actionFailed);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={editHref} className="btn-secondary text-xs">
          {labels.edit}
        </Link>
        <button onClick={toggleSold} disabled={busy} className="btn-secondary text-xs">
          {isSold ? labels.markAvailable : labels.markSold}
        </button>
        <button onClick={remove} disabled={busy} className="btn-danger text-xs">
          {labels.delete}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
