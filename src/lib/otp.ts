import crypto from "crypto";
import { db } from "./db";
import { ApiError } from "./api";
import { emailSender, smsSender } from "./providers/messaging";

export const OTP_TTL_MIN = 5;
export const RESEND_COOLDOWN_S = 60;
export const MAX_ATTEMPTS = 5;
export const MAX_PER_HOUR = 6;

const hash = (code: string, target: string) =>
  crypto.createHmac("sha256", process.env.AUTH_SECRET || "dev").update(`${target}:${code}`).digest("hex");

export function normalizeTarget(raw: string) {
  const t = raw.trim().toLowerCase();
  if (t.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw new ApiError(400, "Enter a valid email");
    return { target: t, channel: "email" as const };
  }
  let p = t.replace(/[^\d+]/g, "");
  if (p.startsWith("+880")) p = "0" + p.slice(4);
  else if (p.startsWith("880")) p = "0" + p.slice(3);
  if (!/^01[3-9]\d{8}$/.test(p)) throw new ApiError(400, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");
  return { target: p, channel: "phone" as const };
}

export async function issueOtp(rawTarget: string, purpose: string, ip?: string) {
  const { target, channel } = normalizeTarget(rawTarget);
  const last = await db.otpCode.findFirst({ where: { target }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_S * 1000) {
    const wait = RESEND_COOLDOWN_S - Math.floor((Date.now() - last.createdAt.getTime()) / 1000);
    throw new ApiError(429, `Please wait ${wait}s before requesting another code`);
  }
  const hourCount = await db.otpCode.count({ where: { target, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (hourCount >= MAX_PER_HOUR) throw new ApiError(429, "Too many codes requested. Try again in an hour.");
  const code = String(crypto.randomInt(100000, 1000000));
  await db.otpCode.create({
    data: { target, purpose, codeHash: hash(code, target), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000), ip },
  });
  const text = `Your Pipilika verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes. Never share it.`;
  await (channel === "email" ? emailSender : smsSender).send(target, "Your Pipilika code", text);
  return { target, channel, devCode: process.env.OTP_DEV_SHOW === "true" ? code : undefined };
}

export async function verifyOtp(rawTarget: string, code: string) {
  const { target, channel } = normalizeTarget(rawTarget);
  const row = await db.otpCode.findFirst({ where: { target, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt < new Date()) throw new ApiError(400, "Code expired. Please request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new ApiError(429, "Too many wrong attempts. Request a new code.");
  const good = crypto.timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash(code.trim(), target)));
  if (!good) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, `Wrong code. ${MAX_ATTEMPTS - row.attempts - 1} attempts left.`);
  }
  await db.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return { target, channel, purpose: row.purpose };
}

export async function verifyCaptcha(token?: string | null) {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return true; // not configured (dev)
  if (!token) throw new ApiError(400, "Please complete the captcha");
  const res = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const j = (await res.json()) as { success: boolean };
  if (!j.success) throw new ApiError(400, "Captcha failed, please try again");
  return true;
}
