import { z } from "zod";
import { ApiError, body, handler, ok } from "@/lib/api";
import { parseDataUrl, putFile } from "@/lib/providers/storage";
import { getStaff } from "@/lib/auth";

/** Staff image upload (product photos, gallery, CMS). Stored under public/ so the storefront can show them. */
export const POST = handler(async (req: Request) => {
  const s = await getStaff();
  if (!s) throw new ApiError(401, "Staff login required");
  const b = await body(req, z.object({ file: z.string().max(14_000_000) }));
  let f;
  try { f = parseDataUrl(b.file); } catch (e) { throw new ApiError(400, (e as Error).message); }
  const key = await putFile(f.buf, f.mime, "public/uploads");
  return ok({ url: `/api/v1/files/${key}`, key });
});
