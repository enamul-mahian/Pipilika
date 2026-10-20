import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

const S = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  const ip = await clientIp();
  rateLimit(`staff:${ip}`, 10, 10 * 60_000);
  rateLimit(`staff:${b.email.toLowerCase()}`, 8, 15 * 60_000);
  const u = await db.user.findUnique({ where: { email: b.email.toLowerCase() } });
  if (!u || u.kind !== "STAFF" || !u.passwordHash || !(await bcrypt.compare(b.password, u.passwordHash)) || !u.isActive)
    throw new ApiError(401, "Wrong email or password");
  const token = await startSession(u.id, "password");
  await audit({ id: u.id, name: u.name }, "login", "user", u.id, { ip });
  return ok({ ok: true, token });
});
