import { z } from "zod";
import { ApiError, body, handler, ok } from "@/lib/api";
import { checkImage, parseDataUrl, putFile } from "@/lib/providers/storage";
import { getStaff } from "@/lib/auth";

/** Staff image upload (product photos, gallery, logo, favicon, CMS). Stored under public/ so the storefront can show them.
 *  Accepts multipart form data (preferred: hosting firewalls often block large base64 JSON bodies) or JSON { file: dataUrl }. */
export const POST = handler(async (req: Request) => {
  const s = await getStaff();
  if (!s) throw new ApiError(401, "Staff login required");
  let f;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const file = (await req.formData()).get("file");
    if (!(file instanceof Blob)) throw new ApiError(400, "No file received");
    try { f = checkImage(Buffer.from(await file.arrayBuffer()), file.type); } catch (e) { throw new ApiError(400, (e as Error).message); }
  } else {
    const b = await body(req, z.object({ file: z.string().max(14_000_000) }));
    try { f = parseDataUrl(b.file); } catch (e) { throw new ApiError(400, (e as Error).message); }
  }
  const key = await putFile(f.buf, f.mime, "public/uploads");
  return ok({ url: `/api/v1/files/${key}`, key });
});
