import { cookies, headers } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession, type SessionPayload } from "./session";
import { can, type Permission } from "./permissions";

/** Reads session from cookie (web) or Authorization: Bearer (mobile app). */
export async function getSession(): Promise<SessionPayload | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) return verifySession(auth.slice(7));
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value);
}

export async function getUser() {
  const s = await getSession();
  if (!s) return null;
  const u = await db.user.findUnique({ where: { id: s.uid }, include: { role: true } });
  if (!u || !u.isActive || u.deletedAt) return null;
  return u;
}

export async function getStaff() {
  const u = await getUser();
  if (!u || u.kind !== "STAFF") return null;
  return { ...u, perms: u.role?.permissions ?? [] };
}

export async function staffCan(p: Permission) {
  const s = await getStaff();
  return s && can(s.perms, p) ? s : null;
}

export async function startSession(userId: string, method: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  const token = await signSession({
    uid: u.id,
    kind: u.kind,
    name: u.name,
    perms: u.role?.permissions ?? [],
  });
  const h = await headers();
  await db.loginEvent.create({
    data: { userId, method, ip: h.get("x-forwarded-for")?.split(",")[0] ?? null, userAgent: h.get("user-agent")?.slice(0, 200) },
  });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure only when the visitor is on https (proxies send x-forwarded-proto).
    secure: process.env.NODE_ENV === "production" && (h.get("x-forwarded-proto") ?? "https").split(",")[0].trim() === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function endSession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}
