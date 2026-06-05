"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Request = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: "NEW" | "HANDLED";
  when: string;
};

export default function AdminRequestRow({
  request,
  labels,
}: {
  request: Request;
  labels: {
    newBadge: string;
    handledBadge: string;
    markHandled: string;
    markNew: string;
    delete: string;
    confirmDelete: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/website-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: request.status === "NEW" ? "HANDLED" : "NEW" }),
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
      const res = await fetch(`/api/admin/website-requests/${request.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError((await res.text().catch(() => "")) || "Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const isNew = request.status === "NEW";

  return (
    <tr className="border-t border-slate-100 align-top dark:border-slate-800">
      <td className="px-3 py-2">{request.name || "—"}</td>
      <td className="px-3 py-2">
        <a href={`mailto:${request.email}`} className="text-brand hover:underline">
          {request.email}
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {request.phone ? (
          <a
            href={`https://wa.me/${request.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            {request.phone}
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="max-w-xs px-3 py-2 text-slate-600 dark:text-slate-400">
        {request.message ? (
          <span className="whitespace-pre-wrap break-words">{request.message}</span>
        ) : (
          "—"
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{request.when}</td>
      <td className="px-3 py-2">
        <span
          className={
            isNew
              ? "inline-block rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand"
              : "inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }
        >
          {isNew ? labels.newBadge : labels.handledBadge}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button onClick={toggle} disabled={busy} className="btn-secondary text-xs">
              {isNew ? labels.markHandled : labels.markNew}
            </button>
            <button onClick={remove} disabled={busy} className="btn-danger text-xs">
              {labels.delete}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </td>
    </tr>
  );
}
