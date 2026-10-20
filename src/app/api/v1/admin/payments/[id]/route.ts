import { z } from "zod";
import { handler, ok, requirePerm } from "@/lib/api";
import { verifyPayment } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { tk } from "@/lib/format";

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const s = await requirePerm("payments.verify");
  const b = z.object({ approve: z.boolean(), note: z.string().max(300).optional() }).parse(await req.json());
  const p = await verifyPayment(id, s.id, b.approve, b.note);
  await audit(s, b.approve ? "verify" : "reject", "payment", id, { amount: p.amount, trxId: p.trxId });
  if (b.approve && p.order) await notifyUser(p.order.userId, "PAYMENT_VERIFIED", { code: p.order.code, amount: tk(p.amount) }, `/account/orders/${p.order.id}`);
  return ok();
});
