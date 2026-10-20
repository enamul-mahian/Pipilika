import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requireUser } from "@/lib/api";
import { parseDataUrl, putFile } from "@/lib/providers/storage";

const S = z.object({ orderId: z.string(), productId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(3).max(1000), photo: z.string().max(12_000_000).optional() });

/** Verified-order reviews only. */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req, S);
  const o = await db.order.findFirst({ where: { id: b.orderId, userId: u.id, status: { in: ["DELIVERED", "CLOSED"] } }, include: { items: true } });
  if (!o || !o.items.some((i) => i.productId === b.productId)) throw new ApiError(400, "You can review products from delivered orders only");
  if (await db.review.findFirst({ where: { userId: u.id, productId: b.productId, orderId: o.id } })) throw new ApiError(400, "You already reviewed this item");
  let photoUrl: string | null = null;
  if (b.photo) { const f = parseDataUrl(b.photo); photoUrl = "/api/v1/files/" + (await putFile(f.buf, f.mime, "public/reviews")); }
  await db.$transaction(async (tx) => {
    await tx.review.create({ data: { productId: b.productId, userId: u.id, name: u.name, orderId: o.id, rating: b.rating, comment: b.comment, photoUrl, isVerified: true } });
    const agg = await tx.review.aggregate({ where: { productId: b.productId, isApproved: true }, _avg: { rating: true }, _count: true });
    await tx.product.update({ where: { id: b.productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  });
  return ok({ ok: true }, 201);
});
