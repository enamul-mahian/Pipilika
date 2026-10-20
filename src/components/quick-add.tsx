"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart";
import { IconCheck, IconPlus } from "./icons";

export function QuickAdd({ p, simple }: { p: { id: string; slug: string; name: string; image?: string; price: number }; simple: boolean }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const cls = "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand text-brand transition hover:bg-brand hover:text-white";
  if (!simple)
    return <Link href={`/product/${p.slug}`} className={cls} aria-label={`Choose options for ${p.name}`}><IconPlus /></Link>;
  return (
    <button
      className={cls}
      aria-label={`Add ${p.name} to cart`}
      onClick={() => {
        add({ productId: p.id, slug: p.slug, name: p.name, image: p.image, qty: 1, unitPrice: p.price });
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? <IconCheck /> : <IconPlus />}
    </button>
  );
}
