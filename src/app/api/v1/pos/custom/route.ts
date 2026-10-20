import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { DesignPayloadS, designMeta, priceDesign, storeDesignFiles } from "@/lib/designs";
import { addEvent, nextOrderCode, shareToken, syncPaid } from "@/lib/orders";
import { ledger } from "@/lib/ledger";
import { bdPhone } from "@/lib/validators";
import { tk } from "@/lib/format";
import { audit } from "@/lib/audit";

const S = DesignPayloadS.extend({
  customer: z.object({ name: z.string().trim().min(2).max(80), phone: bdPhone, fulfillment: z.enum(["DELIVERY", "PICKUP"]), address: z.string().max(400).optional(), deliveryCharge: z.coerce.number().int().min(0).default(0), deliveryDate: z.string().optional() }),
  priceOverride: z.coerce.number().int().min(0).optional().nullable(),
  advance: z.coerce.number().int().min(0).default(0),
  method: z.enum(["CASH", "BKASH", "NAGAD", "BANGLA_QR", "BANK", "CARD"]).default("CASH"),
  trxId: z.string().max(60).optional(),
});

/** Seller creates a custom-cake order at the counter: quote is sent immediately, advance optional. */
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("pos.use");
  const b = await body(req, S);
  const c = b.customer;
  if (c.fulfillment === "DELIVERY" && !c.address?.trim()) throw new ApiError(400, "Enter the delivery address");
  const price = await priceDesign(b.selection, 0);
  const quoted = b.priceOverride || price.subtotal;
  const total = quoted + (c.fulfillment === "DELIVERY" ? c.deliveryCharge : 0);
  if (b.advance > total) throw new ApiError(400, "Advance is more than the total");
  const files = await storeDesignFiles(b);
  const meta = designMeta(b);
  const user = await db.user.findFirst({ where: { phone: c.phone, kind: "CUSTOMER" } });
  const code = await nextOrderCode();
  const dd = c.deliveryDate ? new Date(c.deliveryDate) : null;
  const status = b.advance > 0 ? (b.advance >= total ? "PAID" : "ADVANCE_PAID") : "QUOTE_SENT";
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        code, shareToken: shareToken(), type: "CUSTOM", status, channel: "POS", createdById: s.id,
        userId: user?.id ?? null, customerName: c.name, phone: c.phone, fulfillment: c.fulfillment, address: c.fulfillment === "DELIVERY" ? c.address : null,
        deliveryDate: dd && !isNaN(+dd) ? dd : null, notes: String(b.data.note ?? "").slice(0, 500) || null,
        subtotal: quoted, deliveryCharge: c.fulfillment === "DELIVERY" ? c.deliveryCharge : 0, total, quotedPrice: total, estimatedWeightG: b.selection.grams, paymentMethod: b.method,
        items: { create: [{ name: `Custom cake — ${meta.title}`, unitPrice: quoted, qty: 1, lineTotal: quoted, modifiers: Object.entries(price.breakdown).filter(([, v]) => v).map(([k, v]) => ({ group: k, option: tk(v), priceDelta: v })) }] },
      },
    });
    await tx.customDesign.create({ data: { ...files, ...meta, orderId: o.id, userId: o.userId, data: b.data as never, estimatedPrice: price.total, priceBreakdown: price.breakdown, shapeSurcharge: price.shapeSurcharge, minWeightG: b.selection.grams } });
    await tx.quote.create({ data: { orderId: o.id, amount: total, advanceRequired: b.advance, status: b.advance > 0 ? "APPROVED" : "SENT", respondedAt: b.advance > 0 ? new Date() : null, createdById: s.id, note: b.priceOverride ? `Seller price (calculator: ${tk(price.subtotal)})` : null } });
    if (b.priceOverride && b.priceOverride !== price.subtotal) await tx.priceAdjustment.create({ data: { orderId: o.id, reason: "Seller quote", amount: b.priceOverride - price.subtotal, oldTotal: price.subtotal, newTotal: b.priceOverride, byId: s.id } });
    await addEvent(tx, o.id, status, `Created at POS by ${s.name}`, s.id);
    if (b.advance > 0) {
      await tx.payment.create({ data: { orderId: o.id, method: b.method, kind: b.advance >= total ? "FULL" : "ADVANCE", amount: b.advance, trxId: b.trxId, status: "PAID", verifiedById: s.id, verifiedAt: new Date() } });
      await ledger.saleReceipt(tx, { amount: b.advance, method: b.method, orderCode: code, orderId: o.id, byId: s.id });
      await syncPaid(tx, o.id);
    }
    return o;
  });
  await audit(s, "pos.custom", "order", order.id, { total, advance: b.advance });
  return ok({ id: order.id, code, total, advance: b.advance, due: total - b.advance, token: order.shareToken }, 201);
});
