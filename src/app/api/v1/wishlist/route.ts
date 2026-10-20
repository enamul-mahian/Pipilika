import { z } from "zod";
import { db } from "@/lib/db";
import { body, handler, ok, requireUser } from "@/lib/api";

export const GET = handler(async () => {
  const u = await requireUser();
  const items = await db.wishlist.findMany({ where: { userId: u.id }, include: { product: { include: { images: { take: 1 } } } } });
  return ok({ items });
});
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const { productId } = await body(req, z.object({ productId: z.string() }));
  const ex = await db.wishlist.findUnique({ where: { userId_productId: { userId: u.id, productId } } });
  if (ex) { await db.wishlist.delete({ where: { id: ex.id } }); return ok({ saved: false }); }
  await db.wishlist.create({ data: { userId: u.id, productId } });
  return ok({ saved: true });
});
