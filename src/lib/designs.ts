import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./api";
import { priceCake, PricingError } from "./pricing";
import { parseDataUrl, putFile } from "./providers/storage";

export const DesignPayloadS = z.object({
  data: z.record(z.string(), z.any()),
  preview: z.string().max(12_000_000),
  print: z.string().max(14_000_000).nullish(),
  original: z.string().max(14_000_000).nullish(),
  bgRemoved: z.string().max(14_000_000).nullish(),
  outlineSvg: z.string().max(200_000).nullish(),
  selection: z.object({
    baseId: z.string(), grams: z.number().int().min(250).max(50_000),
    fillingIds: z.array(z.string()).max(10), decorationIds: z.array(z.string()).max(20), extraIds: z.array(z.string()).max(20),
    boardId: z.string().nullish(), printType: z.string().nullish(), shapeCategory: z.string().nullish(), galleryId: z.string().nullish(),
  }),
});
export type DesignPayload = z.infer<typeof DesignPayloadS>;

/** Server-side price for a design (never trust the client total). */
export async function priceDesign(sel: DesignPayload["selection"], deliveryCharge = 0) {
  const [basePrices, options, gallery] = await Promise.all([
    db.cakeBasePrice.findMany(),
    db.cakeOption.findMany({ where: { isActive: true } }),
    sel.galleryId ? db.galleryItem.findUnique({ where: { id: sel.galleryId } }) : null,
  ]);
  const opts = options.map((o) => ({ id: o.id, kind: o.kind, name: o.name, price: o.price, meta: o.meta as any }));
  const printOpt = opts.find((o) => o.kind === "PRINT" && o.meta?.printType === sel.printType);
  const shapeOpt = opts.find((o) => o.kind === "SHAPE" && o.meta?.category === sel.shapeCategory);
  try {
    const r = priceCake({ basePrices, options: opts }, {
      baseId: sel.baseId, grams: sel.grams, fillingIds: sel.fillingIds, decorationIds: sel.decorationIds, extraIds: sel.extraIds,
      boardId: sel.boardId, printId: printOpt?.id, shapeId: shapeOpt?.id, minWeightG: gallery?.minWeightG, deliveryCharge,
    });
    return { ...r, shapeSurcharge: r.breakdown.shape };
  } catch (e) {
    if (e instanceof PricingError) throw new ApiError(400, e.message);
    throw e;
  }
}

async function save(dataUrl: string | null | undefined, folder: string) {
  if (!dataUrl) return null;
  try {
    const f = parseDataUrl(dataUrl);
    return await putFile(f.buf, f.mime, folder);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
}

export async function storeDesignFiles(p: DesignPayload) {
  const [previewKey, printKey, originalKey, bgRemovedKey] = await Promise.all([
    save(p.preview, "designs/preview"), save(p.print, "designs/print"), save(p.original, "designs/original"), save(p.bgRemoved, "designs/bg-removed"),
  ]);
  return { previewKey, printKey, originalKey, bgRemovedKey };
}

export function designMeta(p: DesignPayload) {
  const shape = (p.data.shape ?? {}) as { kind?: string };
  const kind = shape.kind ?? "preset";
  return {
    title: String(p.data.summary ?? "Custom cake").slice(0, 160),
    shapeKind: kind,
    shapeStatus: kind === "custom" || kind === "number" || kind === "letter" ? "SUBMITTED" : "NONE",
    printType: p.selection.printType ?? "NONE",
    printSizeIn: Number(p.data.printSizeIn) || null,
    outlineSvg: p.outlineSvg ?? null,
  };
}
