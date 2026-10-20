import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { verifyOtp } from "@/lib/otp";
import { startSession } from "@/lib/auth";

const S = z.object({ target: z.string().min(3).max(120), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"), name: z.string().trim().min(2).max(80).optional() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  rateLimit(`otpv:${await clientIp()}`, 20, 10 * 60_000);
  const { target, channel } = await verifyOtp(b.target, b.code);
  const where = channel === "email" ? { email: target } : { phone: target };
  let user = await db.user.findFirst({ where });
  if (!user) {
    if (!b.name) throw new ApiError(400, "Please enter your name");
    user = await db.user.create({
      data: { ...where, name: b.name, kind: "CUSTOMER", ...(channel === "email" ? { emailVerified: new Date() } : { phoneVerified: new Date() }) },
    });
    // link guest orders placed with this phone
    if (channel === "phone") await db.order.updateMany({ where: { phone: target, userId: null }, data: { userId: user.id } });
  } else {
    await db.user.update({ where: { id: user.id }, data: channel === "email" ? { emailVerified: new Date() } : { phoneVerified: new Date() } });
  }
  if (!user.isActive || user.deletedAt) throw new ApiError(403, "This account is disabled");
  const token = await startSession(user.id, `otp-${channel}`);
  return ok({ ok: true, kind: user.kind, token, user: { id: user.id, name: user.name } });
});
