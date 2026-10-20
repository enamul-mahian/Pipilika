import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { syncPaid } from "@/lib/orders";
import { parseDataUrl, putFile } from "@/lib/providers/storage";
import { notifyStaff } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

const S = z.object({ method: z.string(), amount: z.number().int().min(1), trxId: z.string().trim().min(3).max(60), proof: z.string().max(12_000_000).optional() });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const b = await body(req, S);
  rateLimit(`pay:${await clientIp()}`, 10, 60 * 60_000);
  const s = await getSettings();
  if (!s.payments.methods[b.method]?.enabled || b.method === "COD") throw new ApiError(400, "Choose a valid payment method");
  const o = await db.order.findUnique({ where: { shareToken: token } });
  if (!o) throw new ApiError(404, "Order not found");
  const due = o.total - o.paidAmount;
  if (b.amount > due) throw new ApiError(400, `Amount is more than the due (${due})`);
  let proofKey: string | null = null;
  if (b.proof) {
    try {
      const f = parseDataUrl(b.proof);
      proofKey = await putFile(f.buf, f.mime, "payment-proofs");
    } catch (e) {
      throw new ApiError(400, (e as Error).message);
    }
  }
  await db.$transaction(async (tx) => {
    await tx.payment.create({ data: { orderId: o.id, method: b.method, amount: b.amount, trxId: b.trxId, proofKey, kind: o.paidAmount > 0 ? "DUE" : b.amount < o.total ? "ADVANCE" : "FULL", status: "VERIFICATION_REQUIRED" } });
    await syncPaid(tx, o.id);
  });
  await notifyStaff("Payment to verify", `${o.code}: ৳${b.amount} via ${b.method} (${b.trxId})`, `/admin/payments`);
  return ok({ ok: true }, 201);
});
