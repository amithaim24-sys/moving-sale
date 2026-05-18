"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type UploadedImage = { cloudinaryPublicId: string; url: string };

export default function ItemImageUploader({
  value,
  onChange,
  label,
  addLabel,
}: {
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  label: string;
  addLabel: string;
}) {
  const t = useTranslations("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: max 8 MB`);
        // Get a fresh single-use signature for each file (unique public_id per upload).
        const sigRes = await fetch("/api/upload/sign", { method: "POST" });
        if (!sigRes.ok) throw new Error("Failed to sign upload");
        const sig = await sigRes.json();

        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sig.apiKey);
        form.append("timestamp", String(sig.timestamp));
        form.append("signature", sig.signature);
        form.append("public_id", sig.public_id);
        form.append("allowed_formats", sig.allowed_formats);
        form.append("overwrite", sig.overwrite);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Upload failed: ${detail.slice(0, 200) || res.statusText}`);
        }
        const data = await res.json();
        uploaded.push({ cloudinaryPublicId: data.public_id, url: data.secure_url });
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function makeMain(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChange(next);
  }

  return (
    <div>
      <label className="label">{label}</label>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t("mainHint")}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((img, i) => {
          const isMain = i === 0;
          return (
            <div
              key={img.cloudinaryPublicId}
              className={`relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 ${
                isMain ? "ring-2 ring-brand" : ""
              }`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="120px" />
              {isMain && (
                <span className="absolute start-1 top-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                  {t("main")}
                </span>
              )}
              {!isMain && (
                <button
                  type="button"
                  onClick={() => makeMain(i)}
                  title={t("setMain")}
                  aria-label={t("setMain")}
                  className="absolute start-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                title={t("delete")}
                aria-label={t("delete")}
                className="absolute end-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          );
        })}
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:bg-slate-50">
          {busy ? "..." : `+ ${addLabel}`}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
