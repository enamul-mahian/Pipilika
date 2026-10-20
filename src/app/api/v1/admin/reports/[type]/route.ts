import { ApiError, handler, ok, requirePerm } from "@/lib/api";
import { buildReport, parseRange, REPORTS, toCsv, type ReportType } from "@/lib/reports";

export const GET = handler(async (req: Request, ctx: { params: Promise<{ type: string }> }) => {
  const { type } = await ctx.params;
  await requirePerm(type === "orders" ? "orders.view" : "reports.view");
  if (!(type in REPORTS)) throw new ApiError(404, "Unknown report");
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { from, to } = parseRange(sp);
  const r = await buildReport(type as ReportType, from, to, { type: sp.type });
  if (sp.format === "csv")
    return new Response(toCsv(r), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pipilika-${type}-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"` } });
  return ok(r);
});
