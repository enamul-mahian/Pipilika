import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { addEvent, nextOrderCode, priceCart, shareToken, syncPaid } from "@/lib/orders";
import { ledger } from "@/lib/ledger";
import { CartLineS } from "@/lib/schemas";
import { audit } from "@/lib/audit";

const S = z.object({
  lines: z.array(CartLineS).min(1).max(100),
  customerName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  discount: z.coerce.number().int().min(0).default(0),
  method: z.enum(["CASH", "BKASH", "NAGAD", "BANGLA_QR", "BANK", "CARD"]),
  paid: z.coerce.number().int().min(0),
  trxId: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
});

/** Instant counter sale: priced server-side, stock deducted, payment recorded as PAID with ledger entry. */
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("pos.use");
  const b = await body(req, S);
  const priced = await priceCart(b.lines);
  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0);
  if (b.discount > subtotal) throw new ApiError(400, "Discount is more than the total");
  const total = subtotal - b.discount;
  const paid = Math.min(b.paid, total);
  const phone = b.phone?.replace(/\D/g, "") || "";
  const user = phone ? await db.user.findFirst({ where: { phone: { endsWith: phone.slice(-10) }, kind: "CUSTOMER" } }) : null;
  const code = await nextOrderCode();
  const order = await db.$transaction(async (tx) => {
    for (const l of priced) {
      if (l.trackStock) {
        const r = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
        if (!r.count) throw new ApiError(400, `${l.name}: not enough stock`);
      }
      await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.qty } } });
    }
    const o = await tx.order.create({
      data: {
        code, shareToken: shareToken(), channel: "POS", status: paid >= total ? "DELIVERED" : "CONFIRMED", fulfillment: "PICKUP",
        userId: user?.id ?? null, customerName: b.customerName || user?.name || "Walk-in customer", phone: phone || "—",
        subtotal, discount: b.discount, total, paymentMethod: b.method, notes: b.note, createdById: s.id,
        items: { create: priced.map((l) => ({ productId: l.productId, name: l.name, variant: l.variant, image: l.image, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal, modifiers: l.modifiers, note: l.note })) },
      },
    });
    await addEvent(tx, o.id, o.status, `POS sale by ${s.name}`, s.id);
    if (paid > 0) {
      await tx.payment.create({ data: { orderId: o.id, method: b.method, kind: paid >= total ? "FULL" : "ADVANCE", amount: paid, trxId: b.trxId, status: "PAID", verifiedById: s.id, verifiedAt: new Date() } });
      await ledger.saleReceipt(tx, { amount: paid, method: b.method, orderCode: code, orderId: o.id, byId: s.id });
    }
    await syncPaid(tx, o.id);
    return o;
  });
  await audit(s, "pos.sale", "order", order.id, { total, paid });
  return ok({ id: order.id, code, total, paid, due: total - paid, token: order.shareToken }, 201);
});
