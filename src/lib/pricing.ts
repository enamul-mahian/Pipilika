// Pure pricing engine shared by web, POS and mobile API. No DB access here.

export type PVariant = { id: string; name: string; price: number; weightG?: number | null };
export type POption = { id: string; name: string; priceDelta: number; rules?: { onlyForVariants?: string[]; excludes?: string[] } | null };
export type PGroup = {
  id: string; name: string; type: "SINGLE" | "MULTI" | "BOOLEAN" | "QUANTITY" | "TEXT";
  required: boolean; minSelect: number; maxSelect?: number | null;
  rules?: { onlyForVariants?: string[] } | null; options: POption[];
};
export type PProduct = { id: string; name: string; basePrice: number; minQty?: number; variants: PVariant[]; modifiers: PGroup[] };

/** selection.options: groupId -> optionIds (SINGLE/MULTI/BOOLEAN) | { [optionId]: qty } (QUANTITY) | string (TEXT) */
export type Selection = { variantId?: string | null; qty: number; options?: Record<string, string[] | Record<string, number> | string> };
export type ModSnapshot = { group: string; option: string; priceDelta: number; qty?: number; text?: string };

export class PricingError extends Error {}

const visibleFor = (rules: { onlyForVariants?: string[] } | null | undefined, variant?: PVariant) =>
  !rules?.onlyForVariants?.length || (!!variant && rules.onlyForVariants.includes(variant.name));

export function priceProduct(p: PProduct, sel: Selection) {
  const qty = Math.max(1, Math.floor(sel.qty || 1));
  if (p.minQty && qty < p.minQty) throw new PricingError(`Minimum order quantity is ${p.minQty}`);
  let variant: PVariant | undefined;
  if (p.variants.length) {
    variant = p.variants.find((v) => v.id === sel.variantId);
    if (!variant) throw new PricingError("Please choose a size");
  }
  let unit = variant ? variant.price : p.basePrice;
  const mods: ModSnapshot[] = [];
  const chosenNames: string[] = [];

  for (const g of p.modifiers) {
    if (!visibleFor(g.rules, variant)) continue;
    const raw = sel.options?.[g.id];
    if (g.type === "TEXT") {
      const text = typeof raw === "string" ? raw.trim().slice(0, 300) : "";
      if (g.required && !text) throw new PricingError(`${g.name} is required`);
      if (text) mods.push({ group: g.name, option: text, priceDelta: 0, text });
      continue;
    }
    if (g.type === "QUANTITY") {
      const map = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, number>) : {};
      let count = 0;
      for (const o of g.options) {
        const n = Math.max(0, Math.min(99, Math.floor(map[o.id] || 0)));
        if (!n || !visibleFor(o.rules, variant)) continue;
        count += n;
        unit += o.priceDelta * n;
        mods.push({ group: g.name, option: o.name, priceDelta: o.priceDelta * n, qty: n });
      }
      if (g.required && count === 0) throw new PricingError(`Please choose ${g.name}`);
      continue;
    }
    const ids = Array.isArray(raw) ? raw : [];
    const picked = g.options.filter((o) => ids.includes(o.id));
    for (const o of picked) if (!visibleFor(o.rules, variant)) throw new PricingError(`${o.name} is not available for ${variant?.name}`);
    const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
    if (picked.length < min) throw new PricingError(`Please choose ${g.name}`);
    const max = g.type === "SINGLE" || g.type === "BOOLEAN" ? 1 : g.maxSelect ?? Infinity;
    if (picked.length > max) throw new PricingError(`Too many choices for ${g.name} (max ${max})`);
    for (const o of picked) {
      unit += o.priceDelta;
      chosenNames.push(o.name);
      mods.push({ group: g.name, option: o.name, priceDelta: o.priceDelta });
    }
  }
  // exclusion rules (e.g. "Vegetable" excludes "Beef")
  for (const g of p.modifiers)
    for (const o of g.options)
      if (chosenNames.includes(o.name))
        for (const ex of o.rules?.excludes ?? [])
          if (chosenNames.includes(ex)) throw new PricingError(`${o.name} cannot be combined with ${ex}`);

  unit = Math.max(0, unit);
  return { unitPrice: unit, qty, lineTotal: unit * qty, variant: variant?.name ?? null, modifiers: mods };
}

// ---------------- Cake pricing ----------------
export type CakeConfig = {
  basePrices: { baseId: string; grams: number; price: number }[];
  options: { id: string; kind: string; name: string; price: number; meta?: { perKg?: boolean } | null }[];
};
export type CakeSelection = {
  baseId: string;
  grams: number;
  fillingIds?: string[];
  decorationIds?: string[];
  printId?: string | null;
  boardId?: string | null;
  extraIds?: string[];
  shapeId?: string | null;
  shapeSurchargeOverride?: number | null;
  minWeightG?: number | null;
  deliveryCharge?: number;
  discount?: number;
};

/** Base price for a weight. Exact match, or per-gram interpolation from nearest defined weights for custom weights. */
export function basePriceFor(cfg: CakeConfig, baseId: string, grams: number) {
  const rows = cfg.basePrices.filter((r) => r.baseId === baseId).sort((a, b) => a.grams - b.grams);
  if (!rows.length) throw new PricingError("This cake base is not available");
  const exact = rows.find((r) => r.grams === grams);
  if (exact) return exact.price;
  const lower = [...rows].reverse().find((r) => r.grams < grams);
  const upper = rows.find((r) => r.grams > grams);
  if (lower && upper) return Math.round(lower.price + ((upper.price - lower.price) * (grams - lower.grams)) / (upper.grams - lower.grams));
  const ref = lower ?? upper!;
  return Math.round((ref.price / ref.grams) * grams);
}

export function priceCake(cfg: CakeConfig, s: CakeSelection) {
  if (!s.grams || s.grams < 250) throw new PricingError("Minimum cake weight is 250g");
  if (s.minWeightG && s.grams < s.minWeightG) throw new PricingError(`This design needs at least ${s.minWeightG}g`);
  const byId = new Map(cfg.options.map((o) => [o.id, o]));
  const kg = s.grams / 1000;
  const line = (id?: string | null) => {
    const o = id ? byId.get(id) : undefined;
    if (!o) return 0;
    return o.meta?.perKg ? Math.round(o.price * kg) : o.price;
  };
  const sum = (ids?: string[]) => (ids ?? []).reduce((a, id) => a + line(id), 0);
  const base = basePriceFor(cfg, s.baseId, s.grams);
  const filling = sum(s.fillingIds);
  const decoration = sum(s.decorationIds);
  const print = line(s.printId);
  const board = line(s.boardId);
  const extras = sum(s.extraIds);
  const shape = s.shapeSurchargeOverride ?? line(s.shapeId);
  const delivery = s.deliveryCharge ?? 0;
  const subtotal = base + filling + decoration + print + board + extras + shape;
  const discount = Math.min(s.discount ?? 0, subtotal);
  return {
    breakdown: { base, filling, decoration, print, board, extras, shape, delivery, discount },
    subtotal,
    total: subtotal + delivery - discount,
  };
}
