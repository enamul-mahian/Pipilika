import { db } from "@/lib/db";
import { handler, ok, requireUser } from "@/lib/api";
export const GET = handler(async () => {
  const u = await requireUser();
  return ok({ items: await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 }) });
});
export const POST = handler(async () => {
  const u = await requireUser();
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  return ok();
});
