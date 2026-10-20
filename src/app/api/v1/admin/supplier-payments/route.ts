import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { ledger } from "@/lib/ledger";
import { audit } from "@/lib/audit";

const S = z.object({ supplierId: z.string(), amount: z.coerce.number().int().positive(), method: z.string().default("CASH"), note: z.string().max(300).optional() });

export const POST = handler(async (req: Request) => {
  const s = await requirePerm("inventory.manage");
  const b = await body(req, S);
  const sup = await db.supplier.findUnique({ where: { id: b.supplierId } });
  if (!sup) throw new ApiError(404, "Supplier not found");
  if (b.amount > sup.due) throw new ApiError(400, `Amount is more than the due (৳${sup.due})`);
  await db.$transaction(async (tx) => {
    const sp = await tx.supplierPayment.create({ data: { supplierId: sup.id, amount: b.amount, method: b.method, note: b.note, byId: s.id } });
    await ledger.supplierPayment(tx, { amount: b.amount, method: b.method, supplierId: sup.id, supplierName: sup.name, refId: sp.id, byId: s.id });
    await tx.supplier.update({ where: { id: sup.id }, data: { due: { decrement: b.amount } } });
  });
  await audit(s, "supplier.pay", "supplier", sup.id, b);
  return ok({ ok: true });
});
