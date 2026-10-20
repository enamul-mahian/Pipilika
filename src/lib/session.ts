import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "pp_session";
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("AUTH_SECRET must be set in production");
  return new TextEncoder().encode(s || "dev-insecure-secret-change-me");
};

export type SessionPayload = { uid: string; kind: "CUSTOMER" | "STAFF"; name: string; perms: string[] };

export async function signSession(p: SessionPayload, days = 30) {
  return new SignJWT(p as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
