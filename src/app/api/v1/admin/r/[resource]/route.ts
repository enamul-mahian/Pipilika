import { db } from "@/lib/db";
import { ApiError, handler, ok, requirePerm } from "@/lib/api";
import { RESOURCES } from "@/lib/resources";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ resource: string }> };
const res = async (ctx: Ctx) => {
  const r = RESOURCES[(await ctx.params).resource];
  if (!r) throw new ApiError(404, "Unknown resource");
  return { ...r, delegate: (db as any)[r.model], name: (await ctx.params).resource };
};

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const r = await res(ctx);
  await requirePerm(r.perm);
  return ok({ items: await r.delegate.findMany({ orderBy: r.orderBy }) });
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const r = await res(ctx);
  const s = await requirePerm(r.perm);
  const data = r.schema.parse(await req.json());
  try {
    const row = await r.delegate.create({ data });
    await audit(s, "create", r.name, row.id, data);
    return ok(row, 201);
  } catch (e: any) {
    if (e?.code === "P2002") throw new ApiError(400, "That value already exists (must be unique)");
    throw e;
  }
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const r = await res(ctx);
  const s = await requirePerm(r.perm);
  const j = await req.json();
  if (!j.id) throw new ApiError(400, "Missing id");
  const data = (r.schema as any).partial ? (r.schema as any).partial().parse(j) : r.schema.parse(j);
  if (r.name === "roles") {
    const role = await db.role.findUnique({ where: { id: j.id } });
    if (role?.name === "Owner") throw new ApiError(400, "The Owner role cannot be changed");
  }
  const row = await r.delegate.update({ where: { id: j.id }, data });
  if (r.name === "reviews") {
    const agg = await db.review.aggregate({ where: { productId: row.productId, isApproved: true }, _avg: { rating: true }, _count: true });
    await db.product.update({ where: { id: row.productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  }
  await audit(s, "update", r.name, j.id, data);
  return ok(row);
});

export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  const r = await res(ctx);
  const s = await requirePerm(r.perm);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "Missing id");
  try {
    await r.delegate.delete({ where: { id } });
  } catch (e: any) {
    if (e?.code === "P2003") throw new ApiError(400, "This item is in use and can't be deleted. Deactivate it instead.");
    throw e;
  }
  await audit(s, "delete", r.name, id);
  return ok();
});
