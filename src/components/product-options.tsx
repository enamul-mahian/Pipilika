"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { priceProduct, PricingError, type PGroup } from "@/lib/pricing";
import { tk } from "@/lib/format";
import { useCart } from "./cart";

type Props = {
  product: {
    id: string; slug: string; name: string; image: string | null; basePrice: number; minQty: number; soldOut: boolean;
    variants: { id: string; name: string; price: number }[];
    modifiers: PGroup[];
  };
  onAdd?: (line: any) => void; // POS override
  compact?: boolean;
};

export function ProductOptions({ product: p, onAdd, compact }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(p.variants[0]?.id ?? null);
  const [qty, setQty] = useState(Math.max(1, p.minQty));
  const [opts, setOpts] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const g of p.modifiers) {
      const defs = g.options.filter((o: any) => o.isDefault).map((o) => o.id);
      if (defs.length) init[g.id] = defs;
    }
    return init;
  });
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);
  const variant = p.variants.find((v) => v.id === variantId);

  const result = useMemo(() => {
    try {
      return { ok: true as const, r: priceProduct({ id: p.id, name: p.name, basePrice: p.basePrice, minQty: p.minQty, variants: p.variants, modifiers: p.modifiers }, { variantId, qty, options: opts }) };
    } catch (e) {
      return { ok: false as const, error: e instanceof PricingError ? e.message : "Invalid selection" };
    }
  }, [p, variantId, qty, opts]);

  const visible = (rules: any) => !rules?.onlyForVariants?.length || (variant && rules.onlyForVariants.includes(variant.name));
  const toggle = (g: PGroup, id: string) => {
    setOpts((cur) => {
      const list: string[] = Array.isArray(cur[g.id]) ? cur[g.id] : [];
      if (g.type === "SINGLE") return { ...cur, [g.id]: [id] };
      if (g.type === "BOOLEAN") return { ...cur, [g.id]: list.includes(id) ? [] : [id] };
      return { ...cur, [g.id]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });
  };

  const add = (buyNow = false) => {
    if (!result.ok) return;
    const summary = [result.r.variant, ...result.r.modifiers.map((m) => (m.text ? `${m.group}: ${m.text}` : m.qty ? `${m.option} ×${m.qty}` : m.option))].filter(Boolean).join(" · ");
    const line = { productId: p.id, slug: p.slug, name: p.name, image: p.image, variantId, variantName: result.r.variant, qty, unitPrice: result.r.unitPrice, options: opts, summary, note: note || undefined };
    if (onAdd) return onAdd(line);
    cart.add(line);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    if (buyNow) router.push("/checkout");
  };

  return (
    <div className={compact ? "grid gap-4" : "mt-6 grid gap-5"}>
      {p.variants.length > 0 && (
        <fieldset>
          <legend className="label">Size / Weight</legend>
          <div className="flex flex-wrap gap-2">
            {p.variants.map((v) => (
              <button type="button" key={v.id} onClick={() => setVariantId(v.id)} aria-pressed={v.id === variantId} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${v.id === variantId ? "border-brand bg-blush text-brand" : "border-line bg-white"}`}>
                {v.name} <span className="font-normal text-muted">· {tk(v.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {p.modifiers.filter((g) => visible(g.rules)).map((g) => (
        <fieldset key={g.id}>
          <legend className="label">{g.name} {g.required ? <span className="text-brand">*</span> : <span className="font-normal text-muted">(optional{g.type === "MULTI" && g.maxSelect ? `, up to ${g.maxSelect}` : ""})</span>}</legend>
          {g.type === "TEXT" ? (
            <input className="input" maxLength={300} value={opts[g.id] ?? ""} onChange={(e) => setOpts({ ...opts, [g.id]: e.target.value })} placeholder="Type here…" />
          ) : g.type === "QUANTITY" ? (
            <div className="grid gap-2">
              {g.options.filter((o) => visible(o.rules)).map((o) => {
                const n = opts[g.id]?.[o.id] ?? 0;
                const set = (v: number) => setOpts({ ...opts, [g.id]: { ...(opts[g.id] ?? {}), [o.id]: Math.max(0, v) } });
                return (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm">
                    <span>{o.name} <span className="text-muted">+{tk(o.priceDelta)} each</span></span>
                    <span className="flex items-center gap-2"><button type="button" className="btn-ghost btn-sm" onClick={() => set(n - 1)} aria-label="Less">−</button>{n}<button type="button" className="btn-ghost btn-sm" onClick={() => set(n + 1)} aria-label="More">+</button></span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {g.options.filter((o) => visible(o.rules)).map((o) => {
                const on = (opts[g.id] ?? []).includes(o.id);
                return (
                  <button type="button" key={o.id} onClick={() => toggle(g, o.id)} aria-pressed={on} className={`rounded-lg border px-3 py-2 text-sm ${on ? "border-brand bg-blush font-semibold text-brand" : "border-line bg-white"}`}>
                    {o.name}{o.priceDelta !== 0 && <span className="text-muted"> {o.priceDelta > 0 ? "+" : "−"}{tk(Math.abs(o.priceDelta))}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
      <div>
        <label className="label" htmlFor="note">Special instruction (optional)</label>
        <input id="note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. less sugar, write 'Happy Birthday'" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-line bg-white">
          <button type="button" className="px-3 py-2 text-lg" onClick={() => setQty(Math.max(p.minQty || 1, qty - 1))} aria-label="Decrease">−</button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button type="button" className="px-3 py-2 text-lg" onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Increase">+</button>
        </div>
        <p className="text-2xl font-bold text-brand">{result.ok ? tk(result.r.lineTotal) : "—"}</p>
      </div>
      {!result.ok && <p className="text-sm text-red-700">{result.error}</p>}
      {p.soldOut ? <p className="font-semibold text-red-700">Sold out</p> : (
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary flex-1 sm:flex-none" disabled={!result.ok} onClick={() => add(false)}>{added ? "Added ✓" : onAdd ? "Add to sale" : "Add to cart"}</button>
          {!onAdd && <button type="button" className="btn-outline flex-1 sm:flex-none" disabled={!result.ok} onClick={() => add(true)}>Buy now</button>}
        </div>
      )}
    </div>
  );
}
