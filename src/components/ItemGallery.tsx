"use client";

import Image from "next/image";
import { useState } from "react";
import Lightbox from "./Lightbox";

export type GalleryImage = { id: string; url: string };

export default function ItemGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        —
      </div>
    );
  }

  const active = images[activeIdx] ?? images[0];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label="Open photo viewer"
        className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
      >
        <Image
          key={active.id}
          src={active.url}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover transition group-active:scale-[0.99]"
          priority
        />
        <span className="absolute end-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm opacity-0 transition group-hover:opacity-100 group-focus:opacity-100 sm:opacity-100">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`relative aspect-square overflow-hidden rounded-lg bg-slate-100 transition dark:bg-slate-800 ${
                  isActive
                    ? "ring-2 ring-brand"
                    : "opacity-80 hover:opacity-100 ring-1 ring-slate-200 dark:ring-slate-700"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            );
          })}
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          images={images}
          startIndex={activeIdx}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
