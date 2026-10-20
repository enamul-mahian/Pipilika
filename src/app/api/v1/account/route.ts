import { z } from "zod";
import { db } from "@/lib/db";
import { body, handler, ok, requireUser } from "@/lib/api";
import { endSession } from "@/lib/auth";

export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ id: u.id, name: u.name, email: u.email, phone: u.phone, birthday: u.birthday, marketingOptIn: u.marketingOptIn });
});

export const PATCH = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req, z.object({ name: z.string().trim().min(2).max(80), birthday: z.string().max(10).optional(), marketingOptIn: z.boolean().optional() }));
  await db.user.update({ where: { id: u.id }, data: { name: b.name, birthday: b.birthday || null, marketingOptIn: b.marketingOptIn } });
  return ok();
});

/** Account deletion (store-policy requirement): anonymise personal data, keep orders for accounting. */
export const DELETE = handler(async () => {
  const u = await requireUser();
  if (u.kind === "STAFF") return ok({ error: "Staff accounts are removed by the owner" }, 400);
  await db.$transaction([
    db.address.deleteMany({ where: { userId: u.id } }),
    db.wishlist.deleteMany({ where: { userId: u.id } }),
    db.notification.deleteMany({ where: { userId: u.id } }),
    db.user.update({ where: { id: u.id }, data: { name: "Deleted user", email: null, phone: null, birthday: null, isActive: false, deletedAt: new Date() } }),
  ]);
  await endSession();
  return ok();
});
