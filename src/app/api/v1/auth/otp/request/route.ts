import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { issueOtp, normalizeTarget, verifyCaptcha } from "@/lib/otp";

const S = z.object({ target: z.string().min(3).max(120), purpose: z.enum(["login", "reset"]).default("login"), captcha: z.string().optional() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  const ip = await clientIp();
  rateLimit(`otp:${ip}`, 10, 10 * 60_000);
  if (b.purpose === "login") await verifyCaptcha(b.captcha);
  const { target, channel } = normalizeTarget(b.target);
  const user = await db.user.findFirst({ where: channel === "email" ? { email: target } : { phone: target } });
  if (b.purpose === "reset" && (!user || user.kind !== "STAFF")) return ok({ ok: true, channel }); // don't reveal accounts
  const r = await issueOtp(target, user ? b.purpose : "register", ip);
  return ok({ ok: true, channel, isNew: !user, devCode: r.devCode });
});
