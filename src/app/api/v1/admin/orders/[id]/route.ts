import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, ok, requirePerm } from "@/lib/api";
import { addEvent, collectPayment, shareToken, syncPaid } from "@/lib/orders";
import { ledger } from "@/lib/ledger";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getFile, putFile, mimeOf } from "@/lib/providers/storage";
import { tk, statusLabel } from "@/lib/format";

const A = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.string().min(2).max(40), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("quote"), amount: z.coerce.number().int().min(1), advanceRequired: z.coerce.number().int().min(0).default(0), note: z.string().max(1000).optional(), estimatedReadyAt: z.string().optional() }),
  z.object({ action: z.literal("reject"), reason: z.string().min(2).max(500) }),
  z.object({ action: z.literal("adjust"), reason: z.string().min(2).max(80), amount: z.coerce.number().int(), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("final"), finalWeightG: z.coerce.number().int().min(0).optional(), finalPrice: z.coerce.number().int().min(0), reason: z.string().min(2).max(80), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("collect"), amount: z.coerce.number().int().min(1), method: z.string(), trxId: z.string().max(60).optional() }),
  z.object({ action: z.literal("refund"), amount: z.coerce.number().int().min(1), method: z.string(), reason: z.string().min(2).max(300) }),
  z.object({ action: z.literal("shape"), shapeStatus: z.enum(["SUBMITTED", "APPROVED", "NEEDS_CHANGES", "REJECTED"]), shapeSurcharge: z.coerce.number().int().min(0).optional(), minWeightG: z.coerce.number().int().min(0).optional(), productionNotes: z.string().max(1000).optional() }),
  z.object({ action: z.literal("notes"), notes: z.string().max(1000) }),
  z.object({ action: z.literal("share") }),
  z.object({ action: z.literal("gallery"), title: z.string().min(2).max(120) }),
]);

const PAYMENT_MANAGE = new Set(["collect", "refund"]);

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = A.parse(await req.json());
  const s = await requirePerm(PAYMENT_MANAGE.has(b.action) ? "payments.verify" : b.action === "gallery" ? "products.manage" : "orders.manage");
  const o = await db.order.findUnique({ where: { id }, include: { items: true, design: true } });
  if (!o) throw new ApiError(404, "Order not found");
  const actor = { id: s.id, name: s.name };
  let result: unknown = { ok: true };

  switch (b.action) {
    case "status": {
      if (b.status === o.status) break;
      await db.$transaction(async (tx) => {
        if (b.status === "CANCELLED" && o.status !== "CANCELLED") {
          for (const it of o.items) if (it.productId) {
            const p = await tx.product.findUnique({ where: { id: it.productId } });
            if (p && p.stock != null && !p.madeToOrder) await tx.product.update({ where: { id: p.id }, data: { stock: { increment: it.qty } } });
          }
        }
        await tx.order.update({ where: { id }, data: { status: b.status } });
        await addEvent(tx, id, b.status, b.note, s.id);
      });
      await notifyUser(o.userId, "STATUS_CHANGED", { code: o.code, status: statusLabel(b.status) }, `/account/orders/${id}`);
      break;
    }
    case "quote": {
      const ready = b.estimatedReadyAt ? new Date(b.estimatedReadyAt) : null;
      await db.$transaction(async (tx) => {
        await tx.quote.updateMany({ where: { orderId: id, status: "SENT" }, data: { status: "SUPERSEDED" } });
        await tx.quote.create({ data: { orderId: id, amount: b.amount, advanceRequired: b.advanceRequired, note: b.note, estimatedReadyAt: ready, createdById: s.id } });
        await tx.order.update({ where: { id }, data: { status: "QUOTE_SENT", quotedPrice: b.amount, estimatedReadyAt: ready, shareToken: o.shareToken ?? shareToken() } });
        await addEvent(tx, id, "QUOTE_SENT", `Quote ${tk(b.amount)}`, s.id);
      });
      await notifyUser(o.userId, "QUOTE_SENT", { code: o.code, amount: tk(b.amount) }, `/account/orders/${id}`);
      break;
    }
    case "reject":
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: "REJECTED" } });
        await addEvent(tx, id, "REJECTED", b.reason, s.id);
      });
      await notifyUser(o.userId, "STATUS_CHANGED", { code: o.code, status: `rejected: ${b.reason}` });
      break;
    case "adjust": {
      const newTotal = Math.max(0, o.total + b.amount);
      await db.$transaction(async (tx) => {
        await tx.priceAdjustment.create({ data: { orderId: id, reason: b.reason, amount: b.amount, note: b.note, oldTotal: o.total, newTotal, byId: s.id } });
        await tx.order.update({ where: { id }, data: { total: newTotal } });
        await syncPaid(tx, id);
      });
      break;
    }
    case "final": {
      const newTotal = Math.max(0, b.finalPrice + o.deliveryCharge - o.discount);
      await db.$transaction(async (tx) => {
        await tx.priceAdjustment.create({ data: { orderId: id, reason: b.reason, amount: newTotal - o.total, note: b.note ?? `Final price set to ${tk(b.finalPrice)}${b.finalWeightG ? `, weight ${b.finalWeightG}g` : ""}`, oldTotal: o.total, newTotal, byId: s.id } });
        await tx.order.update({ where: { id }, data: { finalPrice: b.finalPrice, finalWeightG: b.finalWeightG ?? o.finalWeightG, subtotal: b.finalPrice, total: newTotal, status: o.type === "CUSTOM" ? "FINAL_PRICE_SET" : o.status } });
        if (o.type === "CUSTOM") await addEvent(tx, id, "FINAL_PRICE_SET", `Final ${tk(newTotal)}`, s.id);
        await syncPaid(tx, id);
      });
      break;
    }
    case "collect": {
      const due = o.total - o.paidAmount;
      if (b.amount > due) throw new ApiError(400, `Amount is more than due (${tk(due)})`);
      await collectPayment(id, b.amount, b.method, o.paidAmount > 0 ? "DUE" : b.amount < o.total ? "ADVANCE" : "FULL", s.id, b.trxId);
      const fresh = await db.order.findUniqueOrThrow({ where: { id } });
      if (o.type === "CUSTOM" && ["CUSTOMER_APPROVED", "PAYMENT_PENDING", "QUOTE_SENT"].includes(o.status)) {
        await db.$transaction(async (tx) => {
          const st = fresh.paymentStatus === "PAID" ? "PAID" : "ADVANCE_PAID";
          await tx.order.update({ where: { id }, data: { status: st } });
          await addEvent(tx, id, st, `Collected ${tk(b.amount)}`, s.id);
        });
      }
      break;
    }
    case "refund": {
      if (b.amount > o.paidAmount) throw new ApiError(400, "Refund is more than the amount paid");
      await db.$transaction(async (tx) => {
        await tx.refund.create({ data: { orderId: id, amount: b.amount, method: b.method, reason: b.reason, byId: s.id } });
        await ledger.refund(tx, { amount: b.amount, method: b.method, orderCode: o.code, orderId: id, byId: s.id });
        await syncPaid(tx, id);
        await addEvent(tx, id, "REFUND", `${tk(b.amount)}: ${b.reason}`, s.id);
      });
      break;
    }
    case "shape":
      if (!o.design) throw new ApiError(400, "No design on this order");
      await db.customDesign.update({ where: { id: o.design.id }, data: { shapeStatus: b.shapeStatus, shapeSurcharge: b.shapeSurcharge, minWeightG: b.minWeightG, productionNotes: b.productionNotes } });
      await db.orderEvent.create({ data: { orderId: id, status: `SHAPE_${b.shapeStatus}`, note: b.productionNotes, byId: s.id } });
      break;
    case "notes":
      await db.order.update({ where: { id }, data: { notes: b.notes } });
      break;
    case "share": {
      const t = o.shareToken ?? shareToken();
      if (!o.shareToken) await db.order.update({ where: { id }, data: { shareToken: t } });
      result = { url: `/o/${t}` };
      break;
    }
    case "gallery": {
      const key = o.design?.previewKey;
      if (!key) throw new ApiError(400, "This order has no design preview");
      const buf = await getFile(key);
      if (!buf) throw new ApiError(400, "Preview file missing");
      const pub = await putFile(buf, mimeOf(key), "public/gallery");
      const g = await db.galleryItem.create({ data: { title: b.title, image: `/api/v1/files/${pub}`, description: o.design?.title, minWeightG: o.finalWeightG ?? o.estimatedWeightG, startPrice: o.finalPrice ?? o.quotedPrice ?? o.subtotal, designData: o.design?.data as never, tags: ["custom"] } });
      result = { id: g.id };
      break;
    }
  }
  await audit(actor, b.action, "order", id, b);
  return ok(result);
});
