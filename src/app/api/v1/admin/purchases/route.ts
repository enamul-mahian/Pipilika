import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { ledger } from "@/lib/ledger";
import { audit } from "@/lib/audit";

const S = z.object({
  supplierId: z.string(), invoiceNo: z.string().max(60).optional(), method: z.string().default("CASH"), paid: z.coerce.number().int().min(0).default(0), note: z.string().max(300).optional(),
  items: z.array(z.object({ itemId: z.string(), qty: z.coerce.number().positive(), unitCost: z.coerce.number().min(0) })).min(1, "Add at least one item"),
});

/** Purchase: stock in + inventory/payable journal + optional payment, supplier due updated. */
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("inventory.manage");
  const b = await body(req, S);
  const sup = await db.supplier.findUnique({ where: { id: b.supplierId } });
  if (!sup) throw new ApiError(404, "Supplier not found");
  const lines = b.items.map((i) => ({ ...i, total: Math.round(i.qty * i.unitCost) }));
  const total = lines.reduce((a, l) => a + l.total, 0);
  if (total <= 0) throw new ApiError(400, "Total must be positive");
  if (b.paid > total) throw new ApiError(400, "Paid cannot exceed total");
  const p = await db.$transaction(async (tx) => {
    const p = await tx.purchase.create({ data: { supplierId: sup.id, invoiceNo: b.invoiceNo, total, paid: b.paid, due: total - b.paid, method: b.method, note: b.note, byId: s.id, items: { create: lines } } });
    for (const l of lines) {
      const it = await tx.inventoryItem.findUniqueOrThrow({ where: { id: l.itemId } });
      const newStock = it.stock + l.qty;
      const avg = newStock > 0 ? (it.stock * it.costPerUnit + l.qty * l.unitCost) / newStock : l.unitCost;
      await tx.inventoryItem.update({ where: { id: it.id }, data: { stock: newStock, costPerUnit: Math.round(avg * 100) / 100 } });
      await tx.stockMovement.create({ data: { itemId: it.id, type: "IN", qty: l.qty, note: `Purchase ${b.invoiceNo ?? ""}`.trim(), refType: "purchase", refId: p.id, byId: s.id } });
    }
    await ledger.purchase(tx, { total, supplierId: sup.id, purchaseId: p.id, supplierName: sup.name, byId: s.id });
    if (b.paid > 0) {
      const sp = await tx.supplierPayment.create({ data: { supplierId: sup.id, purchaseId: p.id, amount: b.paid, method: b.method, byId: s.id } });
      await ledger.supplierPayment(tx, { amount: b.paid, method: b.method, supplierId: sup.id, supplierName: sup.name, refId: sp.id, byId: s.id });
    }
    await tx.supplier.update({ where: { id: sup.id }, data: { due: { increment: total - b.paid } } });
    return p;
  });
  await audit(s, "purchase.create", "purchase", p.id, { total, paid: b.paid });
  return ok(p, 201);
});
