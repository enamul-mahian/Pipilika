import { z } from "zod";
import { db } from "@/lib/db";
import { body, handler, ok, requirePerm } from "@/lib/api";

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requirePerm("customers.view");
  const { id } = await ctx.params;
  const b = await body(req, z.object({ notes: z.string().max(4000) }));
  await db.user.update({ where: { id }, data: { notes: b.notes } });
  return ok({ ok: true });
});
