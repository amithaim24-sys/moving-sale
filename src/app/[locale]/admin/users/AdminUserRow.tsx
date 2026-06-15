"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminUserRow({
  user,
  viewerIsOwner,
  labels,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "SELLER" | "ADMIN" | "OWNER";
    banned: boolean;
    itemCount: number;
  };
  viewerIsOwner: boolean;
  labels: {
    promote: string;
    demote: string;
    makeSeller: string;
    makeBuyer: string;
    ban: string;
    unban: string;
    owner: string;
    sellerBadge: string;
  };
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

  const isOwnerRow = user.role === "OWNER";
  // Only the owner can change roles, and never the owner role itself.
  const canChangeRole = viewerIsOwner && !isOwnerRow;
  const canBan = viewerIsOwner || !isOwnerRow;

  const roleBadgeClass =
    isOwnerRow
      ? "bg-amber-500 text-white"
      : user.role === "ADMIN"
        ? "bg-brand text-white"
        : user.role === "SELLER"
          ? "bg-emerald-600 text-white"
          : "bg-slate-200";

  const roleLabel =
    isOwnerRow
      ? labels.owner
      : user.role === "SELLER"
        ? labels.sellerBadge
        : user.role;

  return (
    <tr className="border-t">
      <td className="px-3 py-2">{user.email}</td>
      <td className="px-3 py-2">{user.name ?? "—"}</td>
      <td className="px-3 py-2">
        <span className={`rounded px-2 py-0.5 text-xs ${roleBadgeClass}`}>
          {roleLabel}
        </span>
        {user.banned && (
          <span className="ms-2 rounded bg-red-200 px-2 py-0.5 text-xs">banned</span>
        )}
      </td>
      <td className="px-3 py-2">{user.itemCount}</td>
      <td className="px-3 py-2 space-x-2 space-y-1">
        {/* USER → make them a Seller */}
        {canChangeRole && user.role === "USER" && (
          <button
            disabled={busy}
            onClick={() => update({ role: "SELLER" })}
            className="btn-secondary text-xs"
          >
            {labels.makeSeller}
          </button>
        )}
        {/* SELLER → promote to Admin OR demote to Buyer */}
        {canChangeRole && user.role === "SELLER" && (
          <>
            <button
              disabled={busy}
              onClick={() => update({ role: "ADMIN" })}
              className="btn-secondary text-xs"
            >
              {labels.promote}
            </button>
            <button
              disabled={busy}
              onClick={() => update({ role: "USER" })}
              className="btn-secondary text-xs"
            >
              {labels.makeBuyer}
            </button>
          </>
        )}
        {/* ADMIN → demote to Seller */}
        {canChangeRole && user.role === "ADMIN" && (
          <button
            disabled={busy}
            onClick={() => update({ role: "SELLER" })}
            className="btn-secondary text-xs"
          >
            {labels.demote}
          </button>
        )}
        {canBan && (
          <button
            disabled={busy}
            onClick={() => update({ banned: !user.banned })}
            className="btn-secondary text-xs"
          >
            {user.banned ? labels.unban : labels.ban}
          </button>
        )}
      </td>
    </tr>
  );
}
