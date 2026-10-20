import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, ok, requirePerm } from "@/lib/api";
import { audit } from "@/lib/audit";

const Opt = z.object({ name: z.string().min(1).max(80), priceDelta: z.coerce.number().int(), isDefault: z.boolean().default(false), rules: z.any().optional() });
const Group = z.object({ name: z.string().min(1).max(80), type: z.enum(["SINGLE", "MULTI", "BOOLEAN", "QUANTITY", "TEXT"]), required: z.boolean().default(false), minSelect: z.coerce.number().int().min(0).default(0), maxSelect: z.coerce.number().int().min(1).nullish(), rules: z.any().optional(), options: z.array(Opt).max(40) });
const S = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120), slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, dashes"),
  description: z.string().max(5000).default(""), type: z.enum(["FIXED", "CUSTOM"]), categoryId: z.string().nullish(),
  basePrice: z.coerce.number().int().min(0), compareAt: z.coerce.number().int().min(0).nullish(), stock: z.coerce.number().int().nullish(),
  madeToOrder: z.boolean(), minQty: z.coerce.number().int().min(1).default(1), isFeatured: z.boolean(), isActive: z.boolean(),
  tags: z.array(z.string()).default([]), seoTitle: z.string().max(120).nullish(), seoDesc: z.string().max(300).nullish(),
  images: z.array(z.object({ url: z.string().min(1).max(500), alt: z.string().max(120).nullish() })).max(12),
  variants: z.array(z.object({ name: z.string().min(1).max(40), price: z.coerce.number().int().min(0), weightG: z.coerce.number().int().nullish(), stock: z.coerce.number().int().nullish() })).max(20),
  modifiers: z.array(Group).max(15),
});

/** Create or fully replace a product (images, variants and modifier groups are replaced; past orders keep their snapshots). */
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("products.manage");
  const b = S.parse(await req.json());
  const data = { name: b.name, slug: b.slug, description: b.description, type: b.type, categoryId: b.categoryId || null, basePrice: b.basePrice, compareAt: b.compareAt || null, stock: b.stock ?? null, madeToOrder: b.madeToOrder, minQty: b.minQty, isFeatured: b.isFeatured, isActive: b.isActive, tags: b.tags, seoTitle: b.seoTitle || null, seoDesc: b.seoDesc || null };
  const clash = await db.product.findFirst({ where: { slug: b.slug, NOT: b.id ? { id: b.id } : undefined } });
  if (clash) throw new ApiError(400, "Another product already uses this slug");
  const p = await db.$transaction(async (tx) => {
    const prod = b.id ? await tx.product.update({ where: { id: b.id }, data }) : await tx.product.create({ data });
    await tx.productImage.deleteMany({ where: { productId: prod.id } });
    await tx.productVariant.deleteMany({ where: { productId: prod.id } });
    await tx.modifierGroup.deleteMany({ where: { productId: prod.id } });
    if (b.images.length) await tx.productImage.createMany({ data: b.images.map((im, i) => ({ productId: prod.id, url: im.url, alt: im.alt ?? b.name, sort: i })) });
    if (b.variants.length) await tx.productVariant.createMany({ data: b.variants.map((v, i) => ({ productId: prod.id, name: v.name, price: v.price, weightG: v.weightG ?? null, stock: v.stock ?? null, sort: i })) });
    for (const [gi, g] of b.modifiers.entries())
      await tx.modifierGroup.create({ data: { productId: prod.id, name: g.name, type: g.type, required: g.required, minSelect: g.minSelect, maxSelect: g.maxSelect ?? null, rules: g.rules ?? undefined, sort: gi, options: { create: g.options.map((o, oi) => ({ name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault, rules: o.rules ?? undefined, sort: oi })) } } });
    return prod;
  });
  await audit(s, b.id ? "update" : "create", "product", p.id, { name: b.name, basePrice: b.basePrice });
  return ok({ id: p.id });
});

export const DELETE = handler(async (req: Request) => {
  const s = await requirePerm("products.manage");
  const id = new URL(req.url).searchParams.get("id")!;
  await db.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, slug: `deleted-${Date.now()}-${id.slice(-4)}` } });
  await audit(s, "delete", "product", id);
  return ok();
});
