import Link from "next/link";
import { tk } from "@/lib/format";
import { IconStar } from "./icons";
import { QuickAdd } from "./quick-add";

export type CardProduct = {
  id: string; slug: string; name: string; basePrice: number; compareAt?: number | null; ratingAvg: number; ratingCount: number;
  images: { url: string }[]; variants: { id: string; price: number }[]; modifiers: { required: boolean }[]; type: string;
  stock?: number | null; madeToOrder?: boolean;
};

export function ProductCard({ p }: { p: CardProduct }) {
  const from = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.basePrice;
  const simple = !p.variants.length && !p.modifiers.some((m) => m.required) && p.type === "FIXED";
  const out = p.stock != null && p.stock <= 0 && !p.madeToOrder;
  return (
    <article className="group card fx-glow fx-lift flex flex-col overflow-hidden">
      <Link href={`/product/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-blush">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.images[0]?.url || "/demo/pastries.jpg"} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110" />
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-deep/45 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        <span aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-3 rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-brand opacity-0 shadow-lg backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">View details</span>
        {p.compareAt && p.compareAt > from && <span className="chip absolute left-2 top-2 bg-brand text-white">Sale</span>}
        {out && <span className="chip absolute left-2 top-2 bg-ink text-white">Sold out</span>}
      </Link>
      <div className="flex flex-1 items-end gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-body text-[0.95rem] font-bold leading-tight"><Link href={`/product/${p.slug}`} className="hover:text-brand">{p.name}</Link></h3>
          <p className="mt-1 font-bold">
            {p.variants.length > 1 && <span className="text-xs font-medium text-muted">from </span>}
            {tk(from)}
            {p.compareAt && p.compareAt > from && <s className="ml-1.5 text-xs font-normal text-muted">{tk(p.compareAt)}</s>}
          </p>
          {p.ratingCount > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <IconStar className="h-3.5 w-3.5 fill-gold text-gold" /> {p.ratingAvg.toFixed(1)} ({p.ratingCount})
            </p>
          )}
        </div>
        {!out && <QuickAdd p={{ id: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url, price: from }} simple={simple} />}
      </div>
    </article>
  );
}
