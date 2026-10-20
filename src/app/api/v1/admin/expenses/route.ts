import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { ledger, EXPENSE_CATEGORIES } from "@/lib/ledger";
import { audit } from "@/lib/audit";

const S = z.object({ category: z.string().refine((c) => EXPENSE_CATEGORIES.includes(c), "Pick a category"), amount: z.coerce.number().int().positive(), method: z.string().default("CASH"), note: z.string().max(300).optional(), date: z.string().optional() });

export const POST = handler(async (req: Request) => {
  const s = await requirePerm("accounts.manage");
  const b = await body(req, S);
  const date = b.date ? new Date(b.date) : new Date();
  const e = await db.$transaction(async (tx) => {
    const e = await tx.expense.create({ data: { category: b.category, amount: b.amount, method: b.method, note: b.note, date, byId: s.id } });
    await ledger.expense(tx, { amount: b.amount, method: b.method, category: b.category, expenseId: e.id, note: b.note, byId: s.id });
    return e;
  });
  await audit(s, "expense.create", "expense", e.id, b);
  return ok(e, 201);
});

export const DELETE = handler(async (req: Request) => {
  const s = await requirePerm("accounts.manage");
  const id = new URL(req.url).searchParams.get("id");
  const e = id ? await db.expense.findUnique({ where: { id } }) : null;
  if (!e) throw new ApiError(404, "Not found");
  // Reverse the voucher rather than silently deleting history.
  await db.$transaction(async (tx) => {
    await tx.voucher.deleteMany({ where: { refType: "expense", refId: e.id } });
    await tx.expense.delete({ where: { id: e.id } });
  });
  await audit(s, "expense.delete", "expense", e.id, e);
  return ok({ ok: true });
});
