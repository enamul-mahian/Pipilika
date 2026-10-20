import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok } from "@/lib/api";
import { verifyOtp } from "@/lib/otp";
import { audit } from "@/lib/audit";
import { strongPassword } from "@/lib/validators";


const S = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/), password: strongPassword });

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  const { target } = await verifyOtp(b.email, b.code);
  const u = await db.user.findUnique({ where: { email: target } });
  if (!u || u.kind !== "STAFF") throw new ApiError(400, "Invalid request");
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(b.password, 12) } });
  await audit({ id: u.id, name: u.name }, "password_reset", "user", u.id);
  return ok();
});
