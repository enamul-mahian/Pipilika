export const dynamic = "force-dynamic";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { tk, weightLabel } from "@/lib/format";
export const metadata: Metadata = { title: "Cake gallery — previous custom designs", alternates: { canonical: "/gallery" } };

export default async function Gallery() {
  const items = await db.galleryItem.findMany({ where: { isPublished: true }, orderBy: { sort: "asc" } });
  return (
    <div className="wrap py-8">
      <h1 className="text-4xl">Gallery</h1>
      <p className="mt-1 text-muted">Cakes we&apos;ve made for happy customers. Tap “Order similar” to start from any design.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((g) => (
          <article key={g.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.image} alt={g.title} loading="lazy" className="aspect-square w-full object-cover" />
            <div className="p-3">
              <h2 className="font-body text-base font-bold">{g.title}</h2>
              {g.description && <p className="text-sm text-muted">{g.description}</p>}
              <p className="mt-1 text-xs text-muted">{g.startPrice ? `From ${tk(g.startPrice)}` : ""}{g.minWeightG ? ` · min ${weightLabel(g.minWeightG)}` : ""}</p>
              <Link href={`/custom-cake?gallery=${g.id}`} className="btn-outline btn-sm mt-3 w-full">Order similar design</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
