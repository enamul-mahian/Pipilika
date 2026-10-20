import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await db.product.findFirst({ where: { slug, isActive: true, deletedAt: null }, include: { images: { orderBy: { sort: "asc" } }, variants: { orderBy: { sort: "asc" } }, modifiers: { orderBy: { sort: "asc" }, include: { options: { orderBy: { sort: "asc" } } } }, reviews: { where: { isApproved: true }, take: 20, orderBy: { createdAt: "desc" } } } });
  return p ? ok(p) : fail(404, "Not found");
}
