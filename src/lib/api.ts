import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError, type ZodSchema } from "zod";
import { getStaff, getUser } from "./auth";
import { can, type Permission } from "./permissions";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Wraps a route handler with consistent error handling. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message);
      if (e instanceof ZodError) return fail(400, e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      console.error(e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

export async function body<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

export async function requireUser() {
  const u = await getUser();
  if (!u) throw new ApiError(401, "Please log in");
  return u;
}

export async function requirePerm(p: Permission) {
  const s = await getStaff();
  if (!s) throw new ApiError(401, "Staff login required");
  if (!can(s.perms, p)) throw new ApiError(403, "You don't have permission for this action");
  return s;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

// Simple in-memory rate limiter (per instance). Good enough for single-node deploys.
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  b.n++;
  if (b.n > max) throw new ApiError(429, "Too many requests. Please wait a moment.");
}
