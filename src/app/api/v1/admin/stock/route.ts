import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { audit } from "@/lib/audit";

const S = z.object({ itemId: z.string(), type: z.enum(["IN", "OUT", "ADJUST", "WASTE", "RETURN"]), qty: z.coerce.number(), note: z.string().max(300).optional() });

/** Stock movement. ADJUST sets the counted stock; others add/subtract. */
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("inventory.manage");
  const b = await body(req, S);
  const item = await db.inventoryItem.findUnique({ where: { id: b.itemId } });
  if (!item) throw new ApiError(404, "Item not found");
  if (b.type !== "ADJUST" && b.qty <= 0) throw new ApiError(400, "Quantity must be positive");
  const delta = b.type === "ADJUST" ? b.qty - item.stock : b.type === "IN" || b.type === "RETURN" ? b.qty : -b.qty;
  if (item.stock + delta < 0) throw new ApiError(400, `Not enough stock (have ${item.stock} ${item.unit})`);
  await db.$transaction([
    db.stockMovement.create({ data: { itemId: item.id, type: b.type, qty: delta, note: b.note, byId: s.id } }),
    db.inventoryItem.update({ where: { id: item.id }, data: { stock: { increment: delta } } }),
  ]);
  await audit(s, `stock.${b.type}`, "inventory", item.id, { delta, note: b.note });
  return ok({ ok: true });
});
