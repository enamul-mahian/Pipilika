import { db } from "./db";

/** Order shaped for customer-facing views (no internal notes/staff ids). */
export async function orderForView(id: string) {
  const o = await db.order.findUniqueOrThrow({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      adjustments: { orderBy: { createdAt: "asc" } },
      design: true,
    },
  });
  return {
    id: o.id, code: o.code, type: o.type, status: o.status, createdAt: o.createdAt.toISOString(),
    customerName: o.customerName, phone: o.phone, fulfillment: o.fulfillment, address: o.address, zoneName: o.zoneName,
    deliveryDate: o.deliveryDate?.toISOString() ?? null, notes: o.notes,
    subtotal: o.subtotal, deliveryCharge: o.deliveryCharge, discount: o.discount, total: o.total, paidAmount: o.paidAmount,
    paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, couponCode: o.couponCode,
    estimatedWeightG: o.estimatedWeightG, finalWeightG: o.finalWeightG, quotedPrice: o.quotedPrice, finalPrice: o.finalPrice,
    estimatedReadyAt: o.estimatedReadyAt?.toISOString() ?? null,
    items: o.items.map((i) => ({ id: i.id, name: i.name, variant: i.variant, image: i.image, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal, modifiers: (i.modifiers ?? []) as { group: string; option: string; text?: string; qty?: number }[], note: i.note, productId: i.productId })),
    events: o.events.map((e) => ({ status: e.status, note: e.note, at: e.createdAt.toISOString() })),
    payments: o.payments.map((p) => ({ id: p.id, method: p.method, kind: p.kind, amount: p.amount, trxId: p.trxId, status: p.status, at: p.createdAt.toISOString() })),
    quotes: o.quotes.map((q) => ({ id: q.id, amount: q.amount, advanceRequired: q.advanceRequired, note: q.note, status: q.status, estimatedReadyAt: q.estimatedReadyAt?.toISOString() ?? null, at: q.createdAt.toISOString() })),
    adjustments: o.adjustments.map((a) => ({ reason: a.reason, amount: a.amount, note: a.note, at: a.createdAt.toISOString() })),
    design: o.design ? { id: o.design.id, hasPreview: !!o.design.previewKey, data: o.design.data as any, printType: o.design.printType, shapeStatus: o.design.shapeStatus, estimatedPrice: o.design.estimatedPrice, breakdown: o.design.priceBreakdown as any } : null,
  };
}
export type OrderViewData = Awaited<ReturnType<typeof orderForView>>;
