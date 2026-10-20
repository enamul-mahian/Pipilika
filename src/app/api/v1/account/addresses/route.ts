import { z } from "zod";
import { db } from "@/lib/db";
import { body, handler, ok, requireUser } from "@/lib/api";
import { bdPhone } from "@/lib/validators";

export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ items: await db.address.findMany({ where: { userId: u.id } }) });
});
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req, z.object({ label: z.string().max(30).default("Home"), name: z.string().min(2).max(80), phone: bdPhone, line: z.string().min(3).max(300), area: z.string().max(80).optional(), city: z.string().max(60).default("Dhaka"), isDefault: z.boolean().default(false) }));
  if (b.isDefault) await db.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
  const a = await db.address.create({ data: { ...b, userId: u.id } });
  return ok(a, 201);
});
export const DELETE = handler(async (req: Request) => {
  const u = await requireUser();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await db.address.deleteMany({ where: { id, userId: u.id } });
  return ok();
});
