import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { strongPassword } from "@/lib/validators";
import { audit } from "@/lib/audit";

const S = z.object({ id: z.string().optional(), name: z.string().min(2).max(80), email: z.string().email(), phone: z.string().max(20).optional().nullable(), roleId: z.string(), isActive: z.boolean().default(true), password: z.string().optional() });

export const POST = handler(async (req: Request) => {
  const s = await requirePerm("staff.manage");
  const b = await body(req, S);
  if (b.password) { const r = strongPassword.safeParse(b.password); if (!r.success) throw new ApiError(400, r.error.issues[0].message); }
  if (!b.id && !b.password) throw new ApiError(400, "Set a password for the new staff member");
  if (b.id === s.id && !b.isActive) throw new ApiError(400, "You cannot deactivate yourself");
  const data: any = { name: b.name, email: b.email.toLowerCase(), phone: b.phone || null, roleId: b.roleId, isActive: b.isActive, kind: "STAFF" };
  if (b.password) data.passwordHash = await bcrypt.hash(b.password, 11);
  try {
    const u = b.id ? await db.user.update({ where: { id: b.id }, data }) : await db.user.create({ data });
    await audit(s, b.id ? "staff.update" : "staff.create", "user", u.id, { ...data, passwordHash: undefined });
    return ok({ id: u.id });
  } catch (e: any) {
    if (e?.code === "P2002") throw new ApiError(400, "Email or phone already used");
    throw e;
  }
});
