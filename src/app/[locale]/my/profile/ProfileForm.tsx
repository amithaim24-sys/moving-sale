"use client";

import { useState } from "react";
import { DEFAULT_PHONE_PREFIX } from "@/lib/types";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toaster";

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
  const toast = useToast();
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
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsappPhone: phone, city }),
      });
      setStatus(res.ok ? "saved" : "error");
      toast.show(res.ok ? labels.saved : "Error", res.ok ? "success" : "error");
    } catch {
      setStatus("error");
      toast.show("Error", "error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div>
        <label htmlFor="profile-name" className="label">{labels.name}</label>
        <input id="profile-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="profile-city" className="label">{labels.city}</label>
        <input
          id="profile-city"
          className="field"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={labels.cityPlaceholder}
        />
      </div>
      <div>
        <label htmlFor="profile-phone" className="label">{labels.phone}</label>
        <input
          id="profile-phone"
          className="field"
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+972501234567"
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary disabled:opacity-60" disabled={status === "saving"}>
          {status === "saving" && <Spinner />}
          {labels.save}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-700 dark:text-emerald-400">{labels.saved} ✓</span>}
        {status === "error" && <span className="text-sm text-red-600">Error</span>}
      </div>
    </form>
  );
}
