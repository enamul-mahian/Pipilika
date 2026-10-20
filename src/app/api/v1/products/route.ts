import { db } from "@/lib/db";
import { ok } from "@/lib/api";
/** Public catalog for web/mobile. ?q= &category= &featured=1 &page= */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q"), category = u.searchParams.get("category"), page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const where: any = { isActive: true, deletedAt: null };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (category) where.category = { slug: category };
  if (u.searchParams.get("featured")) where.isFeatured = true;
  const ids = u.searchParams.get("ids");
  if (ids) where.id = { in: ids.split(",").slice(0, 50) };
  const [items, total] = await Promise.all([
    db.product.findMany({ where, skip: (page - 1) * 24, take: 24, orderBy: { createdAt: "desc" }, include: { images: { orderBy: { sort: "asc" } }, variants: { orderBy: { sort: "asc" } }, category: { select: { slug: true, name: true } } } }),
    db.product.count({ where }),
  ]);
  return ok({ items, total, page, pageSize: 24 });
}
