import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, handler, ok, rateLimit } from "@/lib/api";
export const POST = handler(async (req: Request) => {
  const { email } = await body(req, z.object({ email: z.string().email().max(120) }));
  rateLimit(`nl:${await clientIp()}`, 5, 60 * 60_000);
  await db.subscriber.upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase() }, update: {} });
  return ok();
});
