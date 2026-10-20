import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./api";
import { priceProduct, PricingError, type Selection, type PGroup } from "./pricing";
import { evaluateCoupon } from "./coupons";
import { ledger } from "./ledger";

export type CartInput = { productId: string; variantId?: string | null; qty: number; options?: Selection["options"]; note?: string };

export async function nextOrderCode() {
  const n = await db.order.count();
  return `PC-${10001 + n}${crypto.randomInt(0, 9)}`;
}

export const shareToken = () => crypto.randomBytes(16).toString("hex");

/** Reprices cart lines from DB (never trusts client prices). */
export async function priceCart(lines: CartInput[]) {
  if (!lines.length) throw new ApiError(400, "Your cart is empty");
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids }, isActive: true, deletedAt: null },
    include: { variants: { orderBy: { sort: "asc" } }, modifiers: { include: { options: { orderBy: { sort: "asc" } } }, orderBy: { sort: "asc" } }, images: { orderBy: { sort: "asc" }, take: 1 } },
  });
  const priced = [];
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId);
    if (!p) throw new ApiError(400, "A product in your cart is no longer available");
    try {
      const r = priceProduct(
        { id: p.id, name: p.name, basePrice: p.basePrice, minQty: p.minQty, variants: p.variants, modifiers: p.modifiers as unknown as PGroup[] },
        { variantId: l.variantId, qty: l.qty, options: l.options },
      );
      if (p.stock != null && !p.madeToOrder && p.stock < r.qty) throw new ApiError(400, `Only ${p.stock} left of ${p.name}`);
      priced.push({ ...r, productId: p.id, categoryId: p.categoryId, name: p.name, image: p.images[0]?.url ?? null, note: l.note, trackStock: p.stock != null && !p.madeToOrder });
    } catch (e) {
      if (e instanceof PricingError) throw new ApiError(400, `${p.name}: ${e.message}`);
      throw e;
    }
  }
  return priced;
}

export async function quoteCart(lines: CartInput[], opts: { couponCode?: string | null; zoneId?: string | null; fulfillment: string; phone?: string | null; userId?: string | null }) {
  const priced = await priceCart(lines);
  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0);
  let deliveryCharge = 0, zoneName: string | null = null;
  if (opts.fulfillment === "DELIVERY") {
    const zone = opts.zoneId ? await db.deliveryZone.findFirst({ where: { id: opts.zoneId, isActive: true } }) : null;
    if (!zone) throw new ApiError(400, "Please choose a delivery area");
    deliveryCharge = zone.charge;
    zoneName = zone.name;
  }
  let discount = 0, coupon = null as null | { id: string; code: string }, couponMessage: string | null = null;
  if (opts.couponCode) {
    const c = await db.coupon.findUnique({ where: { code: opts.couponCode.trim().toUpperCase() } });
    const uses = c && (opts.phone || opts.userId)
      ? await db.couponRedemption.count({ where: { couponId: c.id, OR: [...(opts.phone ? [{ phone: opts.phone }] : []), ...(opts.userId ? [{ userId: opts.userId }] : [])] } })
      : 0;
    const r = evaluateCoupon(c, priced, deliveryCharge, uses);
    couponMessage = r.message;
    if (r.ok && c) {
      discount = r.discount;
      coupon = { id: c.id, code: c.code };
    }
  }
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  return { priced, subtotal, deliveryCharge, zoneName, discount, coupon, couponMessage, total };
}

export async function addEvent(tx: Prisma.TransactionClient, orderId: string, status: string, note?: string | null, byId?: string | null) {
  await tx.orderEvent.create({ data: { orderId, status, note: note ?? null, byId: byId ?? null } });
}

/** Recomputes paidAmount/paymentStatus from verified payments. */
export async function syncPaid(tx: Prisma.TransactionClient, orderId: string) {
  const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true, refunds: true } });
  const paid = o.payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0) - o.refunds.reduce((a, r) => a + r.amount, 0);
  const pending = o.payments.some((p) => p.status === "VERIFICATION_REQUIRED");
  const status =
    o.refunds.length && paid <= 0 ? "REFUNDED" : paid >= o.total && o.total > 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : pending ? "VERIFICATION_REQUIRED" : "PENDING";
  await tx.order.update({ where: { id: orderId }, data: { paidAmount: paid, paymentStatus: status } });
  return { paid, status };
}

/** Marks a payment verified and books it in the ledger. */
export async function verifyPayment(paymentId: string, byId: string | null, approve: boolean, note?: string) {
  return db.$transaction(async (tx) => {
    const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
    if (p.status === "PAID") throw new ApiError(400, "Payment already verified");
    await tx.payment.update({
      where: { id: p.id },
      data: { status: approve ? "PAID" : "FAILED", verifiedById: byId, verifiedAt: new Date(), note: note ?? p.note },
    });
    if (approve && p.order) {
      await ledger.saleReceipt(tx, { amount: p.amount, method: p.method, orderCode: p.order.code, orderId: p.order.id, byId });
    }
    if (p.orderId) {
      const r = await syncPaid(tx, p.orderId);
      if (approve && p.order?.type === "CUSTOM" && ["CUSTOMER_APPROVED", "PAYMENT_PENDING"].includes(p.order.status)) {
        const ns = r.status === "PAID" ? "PAID" : "ADVANCE_PAID";
        await tx.order.update({ where: { id: p.orderId }, data: { status: ns } });
        await addEvent(tx, p.orderId, ns, `Payment ${p.amount} verified`, byId);
      }
    }
    return p;
  });
}

/** Records a payment that staff collected in person (POS) — immediately PAID + ledger. */
export async function collectPayment(orderId: string, amount: number, method: string, kind: string, byId: string | null, trxId?: string | null) {
  if (amount <= 0) throw new ApiError(400, "Amount must be positive");
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const p = await tx.payment.create({ data: { orderId, amount, method, kind, status: "PAID", trxId, verifiedById: byId, verifiedAt: new Date() } });
    await ledger.saleReceipt(tx, { amount, method, orderCode: o.code, orderId, byId });
    await syncPaid(tx, orderId);
    return p;
  });
}
