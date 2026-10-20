"use client";
import Link from "next/link";
import { useCart } from "./cart";
import { tk } from "@/lib/format";

export function CartView() {
  const { lines, setQty, remove, subtotal, ready } = useCart();
  if (!ready) return <p className="mt-6 text-muted">Loading…</p>;
  if (!lines.length)
    return (
      <div className="card mt-6 p-10 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <div className="mt-4 flex justify-center gap-3"><Link href="/shop" className="btn-primary">Browse products</Link><Link href="/custom-cake" className="btn-outline">Design a cake</Link></div>
      </div>
    );
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="grid gap-3">
        {lines.map((l) => (
          <li key={l.key} className="card flex gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image || "/demo/pastries.jpg"} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link href={`/product/${l.slug}`} className="font-bold hover:text-brand">{l.name}</Link>
              {l.summary && <p className="text-xs text-muted">{l.summary}</p>}
              {l.note && <p className="text-xs text-muted">Note: {l.note}</p>}
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-line">
                  <button className="px-2.5 py-1" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease">−</button>
                  <span className="w-6 text-center text-sm">{l.qty}</span>
                  <button className="px-2.5 py-1" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase">+</button>
                </div>
                <button className="text-sm text-muted underline hover:text-brand" onClick={() => remove(l.key)}>Remove</button>
              </div>
            </div>
            <p className="font-bold">{tk(l.unitPrice * l.qty)}</p>
          </li>
        ))}
      </ul>
      <aside className="card h-fit p-5">
        <p className="flex justify-between"><span>Subtotal</span><b>{tk(subtotal)}</b></p>
        <p className="mt-1 text-xs text-muted">Delivery and coupons are applied at checkout.</p>
        <Link href="/checkout" className="btn-primary mt-4 w-full">Checkout →</Link>
        <Link href="/shop" className="btn-ghost mt-2 w-full">Continue shopping</Link>
      </aside>
    </div>
  );
}
