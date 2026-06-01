"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ItemImageUploader, { type UploadedImage } from "./ItemImageUploader";
import WhatsAppPhoneSidebar from "./WhatsAppPhoneSidebar";
import Spinner from "./Spinner";
import { useToast } from "./Toaster";
import type { ItemCondition, ListingStatus, ListingType } from "@/lib/types";

export type ItemFormValues = {
  title: string;
  description: string;
  type: ListingType;
  condition: ItemCondition | null;
  priceIls: number | null;
  giveIfUnsold: boolean;
  markReduced: boolean;
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
  const toast = useToast();
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPhone, setHasPhone] = useState(!needsPhone);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Snapshot of the form as first rendered, so we can detect unsaved edits.
  const initialSnapshot = useMemo(() => JSON.stringify(initial), [initial]);
  // Set once the user successfully saves, so leaving afterwards doesn't warn.
  const savedRef = useRef(false);

  const isDirty = !savedRef.current && JSON.stringify(values) !== initialSnapshot;

  // Warn before the tab is closed, reloaded, or navigated away while edits are unsaved.
  // This protects work like uploaded photos and typed descriptions from accidental loss.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
      giveIfUnsold: values.type === "GIVE" ? false : values.giveIfUnsold,
      markReduced: values.type === "GIVE" ? false : values.markReduced,
      status: forceStatus ?? values.status,
      images: values.images,
    };
    try {
      const res = await fetch(itemId ? `/api/items/${itemId}` : "/api/items", {
        method: itemId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = (await res.text().catch(() => "")) || t("error.body");
        setError(msg);
        toast.show(msg, "error");
        return;
      }
      savedRef.current = true;
      toast.show(t("form.saved"));
      router.push(`/${locale}/my/items`);
      router.refresh();
    } catch {
      const msg = t("error.body");
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: React.FormEvent) => send(undefined, e);
  const submitDraft = () => send("DRAFT");
  const submitPublish = () => send("AVAILABLE");

  // When editing an item that's still a draft, publishing is the natural next step,
  // so surface a dedicated Publish button instead of hiding it behind the status select.
  const isDraft = itemId != null && values.status === "DRAFT";

  async function remove() {
    if (!itemId) return;
    if (!confirm(t("form.confirmDelete"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = (await res.text().catch(() => "")) || t("error.body");
        setError(msg);
        toast.show(msg, "error");
        return;
      }
      savedRef.current = true;
      router.push(`/${locale}/my/items`);
      router.refresh();
    } catch {
      const msg = t("error.body");
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setBusy(false);
    }
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

      {isDraft && (
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
          {t("form.draftHint")}
        </div>
      )}

      <ItemImageUploader
        value={values.images}
        onChange={(imgs) => set("images", imgs)}
        label={t("form.images")}
        addLabel={t("form.addImage")}
      />

      <div>
        <label htmlFor="field-title" className="label">{t("form.title")}</label>
        <input
          id="field-title"
          required
          maxLength={120}
          autoFocus={!itemId}
          className="field"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={t("form.titlePlaceholder")}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a
            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(values.title.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!values.title.trim()}
            onClick={(e) => {
              if (!values.title.trim()) e.preventDefault();
            }}
            className={`btn-secondary text-xs ${
              values.title.trim() ? "" : "pointer-events-none opacity-50"
            }`}
          >
            🔍 {t("form.findImageOnGoogle", { title: values.title.trim() })}
          </a>
          <span className="text-xs text-slate-500">{t("form.findImageHint")}</span>
        </div>
      </div>

      <div>
        <label htmlFor="field-description" className="label">
          {t("form.description")} <span className="text-xs text-slate-400">({t("form.optional")})</span>
        </label>
        <textarea
          id="field-description"
          rows={4}
          maxLength={4000}
          className="field"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="field-type" className="label">{t("form.type")}</label>
          <select
            id="field-type"
            className="field"
            value={values.type}
            onChange={(e) => set("type", e.target.value as ListingType)}
          >
            <option value="SELL">{t("item.type.SELL")}</option>
            <option value="GIVE">{t("item.type.GIVE")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="field-condition" className="label">{t("form.condition")}</label>
          <select
            id="field-condition"
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
          <label htmlFor="field-price" className="label">{t("form.price")}</label>
          <input
            id="field-price"
            type="number"
            inputMode="numeric"
            min={0}
            disabled={values.type === "GIVE"}
            className="field disabled:bg-slate-100 dark:disabled:bg-slate-900"
            value={values.priceIls ?? ""}
            onChange={(e) => set("priceIls", e.target.value === "" ? null : Number(e.target.value))}
            placeholder={values.type === "GIVE" ? t("item.free") : "100"}
          />
          <p className="mt-1 text-xs text-slate-500">{t("form.priceHelp")}</p>
        </div>
      </div>

      {values.type === "SELL" && itemId && (
        <label
          htmlFor="field-mark-reduced"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/40"
        >
          <input
            id="field-mark-reduced"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            checked={values.markReduced}
            onChange={(e) => set("markReduced", e.target.checked)}
          />
          <span>
            <span className="font-medium">{t("form.markReduced")}</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {t("form.markReducedHelp")}
            </span>
          </span>
        </label>
      )}

      {values.type === "SELL" && (
        <label
          htmlFor="field-give-if-unsold"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/40"
        >
          <input
            id="field-give-if-unsold"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            checked={values.giveIfUnsold}
            onChange={(e) => set("giveIfUnsold", e.target.checked)}
          />
          <span>
            <span className="font-medium">{t("item.giveIfUnsold.formLabel")}</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {t("item.giveIfUnsold.formHelp")}
            </span>
          </span>
        </label>
      )}

      {itemId && (
        <div>
          <label htmlFor="field-status" className="label">{t("form.status")}</label>
          <select
            id="field-status"
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
          {isDraft ? (
            <>
              {/* Editing a draft: Publish is the primary action, keeping it a draft is secondary. */}
              <button
                type="button"
                onClick={submitPublish}
                disabled={busy || !hasPhone}
                className="btn-primary disabled:opacity-60"
              >
                {busy && <Spinner />}
                {t("form.publish")}
              </button>
              <button
                type="button"
                onClick={submitDraft}
                disabled={busy}
                className="btn-secondary disabled:opacity-60"
              >
                {t("form.keepDraft")}
              </button>
            </>
          ) : (
            <>
              <button disabled={busy || !hasPhone} className="btn-primary disabled:opacity-60">
                {busy && <Spinner />}
                {t("form.save")}
              </button>
              {!itemId && (
                <button
                  type="button"
                  onClick={submitDraft}
                  disabled={busy}
                  className="btn-secondary disabled:opacity-60"
                >
                  {busy && <Spinner />}
                  {t("form.saveDraft")}
                </button>
              )}
            </>
          )}
        </div>
        {itemId && (
          <button type="button" onClick={remove} disabled={busy} className="btn-danger disabled:opacity-60">
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
