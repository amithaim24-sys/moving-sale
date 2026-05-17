"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminUserRow({
  user,
  labels,
}: {
  user: { id: string; name: string | null; email: string; role: "USER" | "ADMIN"; banned: boolean; itemCount: number };
  labels: { promote: string; demote: string; ban: string; unban: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(patch: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2">{user.email}</td>
      <td className="px-3 py-2">{user.name ?? "—"}</td>
      <td className="px-3 py-2">
        <span className={`rounded px-2 py-0.5 text-xs ${user.role === "ADMIN" ? "bg-brand text-white" : "bg-slate-200"}`}>
          {user.role}
        </span>
        {user.banned && <span className="ms-2 rounded bg-red-200 px-2 py-0.5 text-xs">banned</span>}
      </td>
      <td className="px-3 py-2">{user.itemCount}</td>
      <td className="px-3 py-2 space-x-2 space-y-1">
        <button
          disabled={busy}
          onClick={() => update({ role: user.role === "ADMIN" ? "USER" : "ADMIN" })}
          className="btn-secondary text-xs"
        >
          {user.role === "ADMIN" ? labels.demote : labels.promote}
        </button>
        <button
          disabled={busy}
          onClick={() => update({ banned: !user.banned })}
          className="btn-secondary text-xs"
        >
          {user.banned ? labels.unban : labels.ban}
        </button>
      </td>
    </tr>
  );
}
