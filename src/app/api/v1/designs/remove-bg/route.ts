import { z } from "zod";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { parseDataUrl } from "@/lib/providers/storage";
import { removeBackground } from "@/lib/providers/background";

const S = z.object({ image: z.string().max(14_000_000) });

/** Returns {dataUrl} from the configured provider, or {dataUrl:null} so the browser fallback runs. */
export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  rateLimit(`bg:${await clientIp()}`, 20, 60 * 60_000);
  if (!process.env.REMOVE_BG_API_KEY) return ok({ dataUrl: null });
  let buf: Buffer;
  try { buf = parseDataUrl(b.image).buf; } catch (e) { throw new ApiError(400, (e as Error).message); }
  const out = await removeBackground(buf);
  return ok({ dataUrl: out ? `data:image/png;base64,${out.toString("base64")}` : null });
});
