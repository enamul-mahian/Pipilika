import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { accountBalances } from "@/lib/ledger";
import { startOfDay } from "@/lib/metrics";
import { audit } from "@/lib/audit";

const S = z.object({ countedCash: z.coerce.number().int().min(0), note: z.string().max(300).optional() });

export const POST = handler(async (req: Request) => {
  const s = await requirePerm("accounts.manage");
  const b = await body(req, S);
  const date = startOfDay();
  if (await db.dailyCashClosing.findUnique({ where: { date } })) throw new ApiError(400, "Today is already closed");
  const cash = (await accountBalances(db)).find((a) => a.code === "1000")?.balance ?? 0;
  const row = await db.dailyCashClosing.create({ data: { date, expectedCash: cash, countedCash: b.countedCash, difference: b.countedCash - cash, note: b.note, byId: s.id } });
  await audit(s, "cash.close", "cash", row.id, row);
  return ok(row, 201);
});
