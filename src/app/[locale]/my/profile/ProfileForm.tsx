"use client";

import { useState } from "react";
import { DEFAULT_PHONE_PREFIX } from "@/lib/types";

export default function ProfileForm({
  initial,
  labels,
}: {
  initial: { name: string; whatsappPhone: string; city: string };
  labels: {
    name: string;
    phone: string;
    city: string;
    cityPlaceholder: string;
    save: string;
    saved: string;
  };
}) {
  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city);
  const [phone, setPhone] = useState(
    initial.whatsappPhone && initial.whatsappPhone.length > 0
      ? initial.whatsappPhone
      : DEFAULT_PHONE_PREFIX,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, whatsappPhone: phone, city }),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-200">
      <div>
        <label className="label">{labels.name}</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">{labels.city}</label>
        <input
          className="field"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={labels.cityPlaceholder}
        />
      </div>
      <div>
        <label className="label">{labels.phone}</label>
        <input
          className="field"
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+972501234567"
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={status === "saving"}>
          {labels.save}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-700">{labels.saved} ✓</span>}
        {status === "error" && <span className="text-sm text-red-600">Error</span>}
      </div>
    </form>
  );
}
