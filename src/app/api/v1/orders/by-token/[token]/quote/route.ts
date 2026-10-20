import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok } from "@/lib/api";
import { addEvent } from "@/lib/orders";
import { notifyStaff } from "@/lib/notify";

const S = z.object({ approve: z.boolean() });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const b = await body(req, S);
  const o = await db.order.findUnique({ where: { shareToken: token }, include: { quotes: { where: { status: "SENT" }, orderBy: { createdAt: "desc" } } } });
  if (!o) throw new ApiError(404, "Order not found");
  const q = o.quotes[0];
  if (!q) throw new ApiError(400, "There is no open quote");
  await db.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: q.id }, data: { status: b.approve ? "APPROVED" : "REJECTED", respondedAt: new Date() } });
    if (b.approve) {
      const total = q.amount + o.deliveryCharge - o.discount;
      await tx.order.update({ where: { id: o.id }, data: { status: "PAYMENT_PENDING", quotedPrice: q.amount, subtotal: q.amount, total, estimatedReadyAt: q.estimatedReadyAt ?? o.estimatedReadyAt } });
      await addEvent(tx, o.id, "CUSTOMER_APPROVED", "Customer approved the quote");
      await addEvent(tx, o.id, "PAYMENT_PENDING");
    } else {
      await tx.order.update({ where: { id: o.id }, data: { status: "UNDER_REVIEW" } });
      await addEvent(tx, o.id, "UNDER_REVIEW", "Customer declined the quote");
    }
  });
  await notifyStaff(b.approve ? "Quote approved" : "Quote declined", `${o.code} — ${o.customerName}`, `/admin/orders/${o.id}`);
  return ok();
});
