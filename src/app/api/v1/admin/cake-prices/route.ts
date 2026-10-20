import { z } from "zod";
import { db } from "@/lib/db";
import { handler, ok, requirePerm } from "@/lib/api";
import { audit } from "@/lib/audit";
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("cake.manage");
  const b = z.object({ prices: z.array(z.object({ baseId: z.string(), grams: z.number().int().min(100), price: z.number().int().min(0) })).max(500) }).parse(await req.json());
  await db.$transaction(b.prices.map((p) => db.cakeBasePrice.upsert({ where: { baseId_grams: { baseId: p.baseId, grams: p.grams } }, create: p, update: { price: p.price } })));
  await audit(s, "update", "cake_prices", null, { count: b.prices.length });
  return ok();
});
