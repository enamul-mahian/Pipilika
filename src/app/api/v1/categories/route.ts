import { db } from "@/lib/db";
import { ok } from "@/lib/api";
export async function GET() {
  return ok({ items: await db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }) });
}
