import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { postVoucher } from "@/lib/ledger";
import { audit } from "@/lib/audit";

const S = z.object({ narration: z.string().min(2).max(200), lines: z.array(z.object({ accountId: z.string(), debit: z.coerce.number().int().min(0).default(0), credit: z.coerce.number().int().min(0).default(0) })).min(2) });

/** Manual journal voucher (must balance). */
export const POST = handler(async (req: Request) => {
  const s = await requirePerm("accounts.manage");
  const b = await body(req, S);
  const accs = await db.ledgerAccount.findMany({ where: { id: { in: b.lines.map((l) => l.accountId) } } });
  const lines = b.lines.filter((l) => l.debit || l.credit).map((l) => {
    const a = accs.find((x) => x.id === l.accountId);
    if (!a) throw new ApiError(400, "Unknown account");
    return { account: { code: a.code, name: a.name, type: a.type }, debit: l.debit, credit: l.credit };
  });
  try {
    const v = await postVoucher(db, { type: "JOURNAL", narration: b.narration, byId: s.id }, lines);
    await audit(s, "journal.create", "voucher", v.id, b);
    return ok(v, 201);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
});
