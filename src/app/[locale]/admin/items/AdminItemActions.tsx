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
  labels: { hide: string; show: string; delete: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: hidden ? "AVAILABLE" : "HIDDEN" }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("?")) return;
    setBusy(true);
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button onClick={toggle} disabled={busy} className="btn-secondary text-xs">
        {hidden ? labels.show : labels.hide}
      </button>
      <button onClick={remove} disabled={busy} className="btn-danger text-xs">
        {labels.delete}
      </button>
    </div>
  );
}
