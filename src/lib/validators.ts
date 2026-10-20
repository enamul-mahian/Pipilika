import { z } from "zod";
export const strongPassword = z.string().min(10, "Password must be at least 10 characters").max(200).regex(/[A-Za-z]/, "Password needs a letter").regex(/\d/, "Password needs a number");
export const bdPhone = z.string().trim().transform((v) => v.replace(/[^\d+]/g, "").replace(/^\+?880/, "0")).refine((v) => /^01[3-9]\d{8}$/.test(v), "Enter a valid mobile number (01XXXXXXXXX)");
export const money = z.coerce.number().int().min(0).max(10_000_000);
