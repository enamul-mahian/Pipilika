import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, handler, ok, rateLimit, ApiError } from "@/lib/api";
import { addEvent, nextOrderCode, quoteCart, shareToken } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { bdPhone } from "@/lib/validators";
import { CartLineS } from "@/lib/schemas";
import { getSettings } from "@/lib/settings";
import { notifyStaff, notifyUser } from "@/lib/notify";
import { tk } from "@/lib/format";

const S = z.object({
  name: z.string().trim().min(2).max(80),
  phone: bdPhone,
  email: z.string().email().max(120).optional().or(z.literal("")),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]),
  zoneId: z.string().nullish(),
  address: z.string().max(400).optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  method: z.string(),
  trxId: z.string().max(60).optional(),
  couponCode: z.string().max(40).nullish(),
  source: z.string().max(60).nullish(),
  lines: z.array(CartLineS).min(1).max(50),
});

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  rateLimit(`order:${await clientIp()}`, 15, 60 * 60_000);
  if (b.fulfillment === "DELIVERY" && !b.address?.trim()) throw new ApiError(400, "Please enter the delivery address");
  const settings = await getSettings();
  if (!settings.payments.methods[b.method]?.enabled) throw new ApiError(400, "This payment method is not available");
  const session = await getSession();
  const q = await quoteCart(b.lines, { couponCode: b.couponCode, zoneId: b.zoneId, fulfillment: b.fulfillment, phone: b.phone, userId: session?.uid });
  if (b.couponCode && !q.coupon) throw new ApiError(400, q.couponMessage ?? "Invalid coupon");
  const code = await nextOrderCode();
  const token = shareToken();
  const deliveryDate = b.deliveryDate ? new Date(b.deliveryDate) : null;

  const order = await db.$transaction(async (tx) => {
    for (const l of q.priced) {
      if (l.trackStock) {
        const r = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
        if (!r.count) throw new ApiError(400, `${l.name} just sold out`);
      }
      await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.qty } } });
    }
    const o = await tx.order.create({
      data: {
        code, shareToken: token, userId: session?.kind === "CUSTOMER" ? session.uid : null,
        customerName: b.name, phone: b.phone, email: b.email || null, channel: req.headers.get("x-client") === "app" ? "APP" : "WEB",
        fulfillment: b.fulfillment, address: b.fulfillment === "DELIVERY" ? b.address : null, zoneName: q.zoneName,
        deliveryDate: deliveryDate && !isNaN(+deliveryDate) ? deliveryDate : null, notes: b.notes,
        subtotal: q.subtotal, deliveryCharge: q.deliveryCharge, discount: q.discount, total: q.total,
        couponCode: q.coupon?.code, paymentMethod: b.method, source: b.source ?? null,
        paymentStatus: b.trxId ? "VERIFICATION_REQUIRED" : "PENDING",
        items: { create: q.priced.map((l) => ({ productId: l.productId, name: l.name, variant: l.variant, image: l.image, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal, modifiers: l.modifiers, note: l.note })) },
      },
    });
    await addEvent(tx, o.id, "PLACED", null, null);
    if (q.coupon) {
      await tx.coupon.update({ where: { id: q.coupon.id }, data: { usedCount: { increment: 1 } } });
      await tx.couponRedemption.create({ data: { couponId: q.coupon.id, orderId: o.id, userId: o.userId, phone: b.phone, amount: q.discount } });
    }
    if (b.trxId && b.method !== "COD") await tx.payment.create({ data: { orderId: o.id, method: b.method, amount: q.total, trxId: b.trxId, status: "VERIFICATION_REQUIRED" } });
    return o;
  });
  await notifyUser(order.userId, "ORDER_PLACED", { code, total: tk(order.total) }, `/account/orders/${order.id}`);
  await notifyStaff("New order", `${code} · ${b.name} · ${tk(order.total)}`, `/admin/orders/${order.id}`);
  return ok({ ok: true, code, token, id: order.id, total: order.total }, 201);
});
