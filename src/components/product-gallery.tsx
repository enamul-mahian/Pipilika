"use client";
import { useState } from "react";

export function ProductGallery({ images }: { images: { url: string; alt: string }[] }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [{ url: "/demo/pastries.jpg", alt: "" }];
  return (
    <div>
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={list[i].url} alt={list[i].alt} className="aspect-[4/3] w-full object-cover" />
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((im, k) => (
            <button key={im.url + k} onClick={() => setI(k)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${k === i ? "border-brand" : "border-transparent"}`} aria-label={`Image ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
