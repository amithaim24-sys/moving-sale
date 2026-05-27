"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslations } from "next-intl";

type AspectKey = "free" | "1:1" | "4:3" | "3:4";

const ASPECT_VALUES: Record<AspectKey, number | undefined> = {
  free: undefined,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
};

async function cropToBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  mime: string,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  // Render to a canvas large enough to hold the rotated source, then extract the cropped region.
  const rotRad = (rotation * Math.PI) / 180;
  const { width: bbW, height: bbH } = rotatedBBox(image.width, image.height, rotRad);

  const off = document.createElement("canvas");
  off.width = bbW;
  off.height = bbH;
  const offCtx = off.getContext("2d");
  if (!offCtx) throw new Error("Canvas unsupported");
  offCtx.translate(bbW / 2, bbH / 2);
  offCtx.rotate(rotRad);
  offCtx.drawImage(image, -image.width / 2, -image.height / 2);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    off,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to export image"))),
      mime,
      0.92,
    );
  });
}

function rotatedBBox(w: number, h: number, rad: number) {
  return {
    width: Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h),
    height: Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.addEventListener("load", () => res(img));
    img.addEventListener("error", (e) => rej(e));
    img.src = src;
  });
}

export default function ImageEditorModal({
  file,
  open,
  onCancel,
  onConfirm,
}: {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob, name: string) => void;
}) {
  const t = useTranslations("form");
  const ta = useTranslations("a11y");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<AspectKey>("1:1");
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect("1:1");
    setPixelCrop(null);
    setError(null);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Focus first interactive element on open; handle Escape to close.
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const firstFocusable = el.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const onCropComplete = useCallback((_: Area, area: Area) => setPixelCrop(area), []);

  async function confirm() {
    if (!file || !objectUrl || !pixelCrop) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToBlob(objectUrl, pixelCrop, rotation, file.type || "image/jpeg");
      onConfirm(blob, file.name);
    } catch {
      // e.g. the file isn't a decodable image — tell the user instead of hanging silently.
      setError(t("imageLoadError"));
    } finally {
      setBusy(false);
    }
  }

  if (!open || !file || !objectUrl) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("applyAndUpload")}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 text-white"
    >
      <div className="relative flex-1">
        <Cropper
          image={objectUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={ASPECT_VALUES[aspect]}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          objectFit="contain"
          showGrid
        />
      </div>

      <div className="space-y-3 bg-slate-950/95 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="editor-zoom">{t("zoom")}</label>
            <input
              id="editor-zoom"
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-32 sm:w-48 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label={ta("zoomLabel")}
            />
          </div>
          <button
            type="button"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            aria-label={ta("rotateLeft")}
            className="rounded-md bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            ⟲ {t("rotateLeft")}
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label={ta("rotateRight")}
            className="rounded-md bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            ⟳ {t("rotateRight")}
          </button>
          <div className="ms-auto flex items-center gap-1 text-xs">
            <span className="opacity-70" aria-hidden="true">{t("aspect")}:</span>
            {(["free", "1:1", "4:3", "3:4"] as AspectKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setAspect(k)}
                aria-pressed={aspect === k}
                aria-label={k === "free" ? ta("aspectRatioFree") : ta("aspectRatio", { ratio: k })}
                className={`rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  aspect === k ? "bg-brand text-white" : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                {k === "free" ? t("aspectFree") : k}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !pixelCrop}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {busy ? "…" : t("applyAndUpload")}
          </button>
        </div>
      </div>
    </div>
  );
}
