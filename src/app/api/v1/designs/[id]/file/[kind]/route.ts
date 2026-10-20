import { PDFDocument } from "pdf-lib";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFile, mimeOf } from "@/lib/providers/storage";
import { fail } from "@/lib/api";

/**
 * Private design files. Access: staff with orders.view, the owning customer, or holder of the order share token (?t=).
 * kinds: preview | print | original | bgremoved | outline (svg) | pdf (print-ready at physical size)
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await ctx.params;
  const url = new URL(req.url);
  const d = await db.customDesign.findUnique({ where: { id }, include: { order: true } });
  if (!d) return fail(404, "Not found");
  const s = await getSession();
  const staff = s?.kind === "STAFF" && can(s.perms, "orders.view");
  const owner = s && d.userId === s.uid;
  const tokenOk = !!url.searchParams.get("t") && url.searchParams.get("t") === d.order?.shareToken;
  if (!staff && !owner && !(tokenOk && kind === "preview")) return fail(403, "Forbidden");
  const dl = url.searchParams.get("download") ? `attachment; filename="${d.order?.code ?? "design"}-${kind}` : "inline";

  if (kind === "outline") {
    if (!d.outlineSvg) return fail(404, "No outline");
    return new Response(d.outlineSvg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": dl === "inline" ? dl : dl + '.svg"' } });
  }
  if (kind === "pdf") {
    if (!d.printKey) return fail(404, "No print asset");
    const png = await getFile(d.printKey);
    if (!png) return fail(404, "File missing");
    const pdf = await PDFDocument.create();
    const img = await pdf.embedPng(png);
    const widthIn = d.printSizeIn || ((d.data as any)?.shape?.widthIn ?? 6);
    const w = widthIn * 72, h = (w * img.height) / img.width;
    const margin = 36;
    const page = pdf.addPage([w + margin * 2, h + margin * 2]);
    page.drawImage(img, { x: margin, y: margin, width: w, height: h });
    page.drawText(`Pipilika ${d.order?.code ?? ""} · ${d.printType ?? ""} · ${widthIn}in wide`, { x: margin, y: 12, size: 8 });
    const bytes = await pdf.save();
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": dl === "inline" ? dl : dl + '.pdf"' } });
  }
  const key = { preview: d.previewKey, print: d.printKey, original: d.originalKey, bgremoved: d.bgRemovedKey }[kind];
  if (!key) return fail(404, "Not found");
  const buf = await getFile(key);
  if (!buf) return fail(404, "File missing");
  const ext = key.split(".").pop();
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": mimeOf(key), "Cache-Control": "private, max-age=3600", "Content-Disposition": dl === "inline" ? dl : `${dl}.${ext}"` } });
}
