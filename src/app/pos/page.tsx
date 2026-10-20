import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { loadDesignerConfig } from "@/lib/cake-config";
import { PosApp } from "@/components/pos";

export default async function Pos() {
  const [staff, products, categories, cfg, recent] = await Promise.all([
    getStaff(),
    db.product.findMany({ where: { isActive: true, deletedAt: null }, orderBy: [{ isFeatured: "desc" }, { name: "asc" }], include: { images: { orderBy: { sort: "asc" }, take: 1 }, variants: { orderBy: { sort: "asc" } }, modifiers: { include: { options: { orderBy: { sort: "asc" } } }, orderBy: { sort: "asc" } }, category: true } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    loadDesignerConfig(),
    db.order.findMany({ where: { channel: "POS" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, code: true, customerName: true, total: true, paidAmount: true, type: true, createdAt: true } }),
  ]);
  return (
    <PosApp
      staffName={staff?.name ?? ""}
      products={products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, basePrice: p.basePrice, minQty: p.minQty, soldOut: p.stock != null && p.stock <= 0 && !p.madeToOrder, stock: p.madeToOrder ? null : p.stock, category: p.category?.slug ?? "", variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price })), modifiers: p.modifiers as any, simple: !p.variants.length && !p.modifiers.length }))}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      config={cfg}
      recent={recent.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))}
    />
  );
}
