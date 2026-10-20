import { z } from "zod";
import { body, handler, ok } from "@/lib/api";
import { quoteCart } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { CartLineS as LineS } from "@/lib/schemas";

const S = z.object({ lines: z.array(LineS).min(1).max(50), couponCode: z.string().max(40).nullish(), zoneId: z.string().nullish(), fulfillment: z.enum(["DELIVERY", "PICKUP"]), phone: z.string().max(20).nullish() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  const s = await getSession();
  const q = await quoteCart(b.lines, { ...b, userId: s?.uid });
  return ok({ subtotal: q.subtotal, deliveryCharge: q.deliveryCharge, discount: q.discount, total: q.total, couponMessage: q.couponMessage, couponApplied: !!q.coupon, lines: q.priced.map((l) => ({ productId: l.productId, unitPrice: l.unitPrice, lineTotal: l.lineTotal })) });
});
