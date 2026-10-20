import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { DesignPayloadS, designMeta, priceDesign, storeDesignFiles } from "@/lib/designs";
import { addEvent, nextOrderCode, shareToken } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { bdPhone } from "@/lib/validators";
import { notifyStaff } from "@/lib/notify";
import { tk } from "@/lib/format";

const S = DesignPayloadS.extend({
  customer: z.object({ name: z.string().trim().min(2).max(80), phone: bdPhone, fulfillment: z.enum(["DELIVERY", "PICKUP"]), zoneId: z.string().optional(), address: z.string().max(400).optional(), deliveryDate: z.string().optional() }),
  source: z.string().max(60).nullish(),
});

/** Customer submits a custom cake design -> creates a CUSTOM order awaiting seller review. */
export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  rateLimit(`design:${await clientIp()}`, 10, 60 * 60_000);
  const c = b.customer;
  let deliveryCharge = 0, zoneName: string | null = null;
  if (c.fulfillment === "DELIVERY") {
    if (!c.address?.trim()) throw new ApiError(400, "Please enter the delivery address");
    const z = c.zoneId ? await db.deliveryZone.findFirst({ where: { id: c.zoneId, isActive: true } }) : null;
    if (!z) throw new ApiError(400, "Please choose a delivery area");
    deliveryCharge = z.charge; zoneName = z.name;
  }
  const price = await priceDesign(b.selection, deliveryCharge);
  const files = await storeDesignFiles(b);
  const session = await getSession();
  const meta = designMeta(b);
  const code = await nextOrderCode();
  const token = shareToken();
  const dd = c.deliveryDate ? new Date(c.deliveryDate) : null;
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        code, shareToken: token, type: "CUSTOM", status: "DESIGN_SUBMITTED", channel: "WEB",
        userId: session?.kind === "CUSTOMER" ? session.uid : null, customerName: c.name, phone: c.phone,
        fulfillment: c.fulfillment, address: c.fulfillment === "DELIVERY" ? c.address : null, zoneName,
        deliveryDate: dd && !isNaN(+dd) ? dd : null, notes: String(b.data.note ?? "").slice(0, 500) || null,
        subtotal: price.subtotal, deliveryCharge, total: price.total, estimatedWeightG: b.selection.grams, source: b.source ?? null,
        items: { create: [{ name: `Custom cake — ${meta.title}`, unitPrice: price.subtotal, qty: 1, lineTotal: price.subtotal, modifiers: Object.entries(price.breakdown).filter(([, v]) => v).map(([k, v]) => ({ group: k, option: tk(v), priceDelta: v })) }] },
      },
    });
    await tx.customDesign.create({
      data: { ...files, ...meta, orderId: o.id, userId: o.userId, data: b.data as never, estimatedPrice: price.total, priceBreakdown: price.breakdown, shapeSurcharge: price.shapeSurcharge, minWeightG: b.selection.grams },
    });
    await addEvent(tx, o.id, "DESIGN_SUBMITTED", "Design submitted by customer");
    return o;
  });
  await notifyStaff("New custom cake request", `${code} · ${c.name} · est. ${tk(price.total)}`, `/admin/orders/${order.id}`);
  return ok({ ok: true, token, code, id: order.id }, 201);
});
