"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryImage = { id: string; url: string };

export default function ItemGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

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
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Image
          key={active.id}
          src={active.url}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
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
    </div>
  );
}
