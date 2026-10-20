import { db } from "@/lib/db";
import { body, handler, ok, requireUser } from "@/lib/api";
import { DesignPayloadS, designMeta, priceDesign, storeDesignFiles } from "@/lib/designs";

/** Logged-in customer saves a design draft to reuse later. */
export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req, DesignPayloadS);
  const price = await priceDesign(b.selection);
  const files = await storeDesignFiles(b);
  const meta = designMeta(b);
  const d = await db.customDesign.create({ data: { ...files, ...meta, shapeStatus: "NONE", userId: u.id, data: b.data as never, estimatedPrice: price.total, priceBreakdown: price.breakdown, isSaved: true } });
  return ok({ ok: true, id: d.id }, 201);
});
