import { db } from "./db";
import { getSettings } from "./settings";
import type { DesignerConfig } from "@/components/cake-designer";

export async function loadDesignerConfig(): Promise<DesignerConfig> {
  const [bases, weights, basePrices, options, gallery, zones, s] = await Promise.all([
    db.cakeBase.findMany({ where: { isActive: true }, orderBy: { sort: "asc" } }),
    db.cakeWeight.findMany({ orderBy: { grams: "asc" } }),
    db.cakeBasePrice.findMany(),
    db.cakeOption.findMany({ where: { isActive: true }, orderBy: [{ kind: "asc" }, { sort: "asc" }] }),
    db.galleryItem.findMany({ where: { isPublished: true }, orderBy: { sort: "asc" } }),
    db.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sort: "asc" } }),
    getSettings(),
  ]);
  return {
    bases: bases.map((b) => ({ id: b.id, name: b.name })),
    weights: weights.map((w) => ({ grams: w.grams, label: w.label })),
    basePrices: basePrices.map((p) => ({ baseId: p.baseId, grams: p.grams, price: p.price })),
    options: options.map((o) => ({ id: o.id, kind: o.kind, name: o.name, price: o.price, meta: o.meta as any })),
    gallery: gallery.map((g) => ({ id: g.id, title: g.title, image: g.image, minWeightG: g.minWeightG, designData: g.designData })),
    zones: zones.map((z) => ({ id: z.id, name: z.name, charge: z.charge })),
    features: s.features,
  };
}
