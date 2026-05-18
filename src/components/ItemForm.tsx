"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import ItemImageUploader, { type UploadedImage } from "./ItemImageUploader";
import WhatsAppPhoneSidebar from "./WhatsAppPhoneSidebar";
import type { ItemCondition, ListingStatus, ListingType } from "@/lib/types";

export type ItemFormValues = {
  title: string;
  description: string;
  type: ListingType;
  condition: ItemCondition | null;
  priceIls: number | null;
  status: ListingStatus;
  images: UploadedImage[];
};

export default function ItemForm({
  initial,
  itemId,
  locale,
  needsPhone,
}: {
  initial: ItemFormValues;
  itemId?: string;
  locale: string;
  needsPhone: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPhone, setHasPhone] = useState(!needsPhone);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function set<K extends keyof ItemFormValues>(k: K, v: ItemFormValues[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  async function send(forceStatus?: ListingStatus, e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      title: values.title,
      description: values.description,
      type: values.type,
      condition: values.condition,
      priceIls: values.type === "GIVE" ? null : values.priceIls,
      status: forceStatus ?? values.status,
      images: values.images,
    };
    const res = await fetch(itemId ? `/api/items/${itemId}` : "/api/items", {
      method: itemId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError((await res.text()) || "Error");
      setBusy(false);
      return;
    }
    router.push(`/${locale}/my/items`);
    router.refresh();
  }

  const submit = (e: React.FormEvent) => send(undefined, e);
  const submitDraft = () => send("DRAFT");

  async function remove() {
    if (!itemId) return;
    if (!confirm("?")) return;
    setBusy(true);
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    router.push(`/${locale}/my/items`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      {!hasPhone && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <span>{t("form.needPhone")}</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="btn-secondary text-xs"
          >
            {t("form.addPhone")}
          </button>
        </div>
      )}

      <ItemImageUploader
        value={values.images}
        onChange={(imgs) => set("images", imgs)}
        label={t("form.images")}
        addLabel={t("form.addImage")}
      />

      <div>
        <label className="label">{t("form.title")}</label>
        <input
          required
          className="field"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>

      <div>
        <label className="label">
          {t("form.description")} <span className="text-xs text-slate-400">({t("form.optional")})</span>
        </label>
        <textarea
          rows={4}
          className="field"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">{t("form.type")}</label>
          <select
            className="field"
            value={values.type}
            onChange={(e) => set("type", e.target.value as ListingType)}
          >
            <option value="SELL">{t("item.type.SELL")}</option>
            <option value="GIVE">{t("item.type.GIVE")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("form.condition")}</label>
          <select
            className="field"
            value={values.condition ?? ""}
            onChange={(e) =>
              set("condition", e.target.value === "" ? null : (e.target.value as ItemCondition))
            }
          >
            <option value="">—</option>
            <option value="NEW">{t("item.condition.NEW")}</option>
            <option value="LIKE_NEW">{t("item.condition.LIKE_NEW")}</option>
            <option value="USED">{t("item.condition.USED")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("form.price")}</label>
          <input
            type="number"
            min={0}
            disabled={values.type === "GIVE"}
            className="field disabled:bg-slate-100"
            value={values.priceIls ?? ""}
            onChange={(e) => set("priceIls", e.target.value === "" ? null : Number(e.target.value))}
            placeholder={values.type === "GIVE" ? t("item.free") : ""}
          />
          <p className="mt-1 text-xs text-slate-500">{t("form.priceHelp")}</p>
        </div>
      </div>

      {itemId && (
        <div>
          <label className="label">{t("form.status")}</label>
          <select
            className="field"
            value={values.status}
            onChange={(e) => set("status", e.target.value as ListingStatus)}
          >
            {(["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "HIDDEN"] as ListingStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(`item.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || !hasPhone} className="btn-primary">
            {t("form.save")}
          </button>
          {!itemId && (
            <button
              type="button"
              onClick={submitDraft}
              disabled={busy}
              className="btn-secondary"
            >
              {t("form.saveDraft")}
            </button>
          )}
        </div>
        {itemId && (
          <button type="button" onClick={remove} className="btn-danger">
            {t("form.delete")}
          </button>
        )}
      </div>

      <WhatsAppPhoneSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSaved={() => setHasPhone(true)}
      />
    </form>
  );
}
