import { z } from "zod";
import type { Permission } from "./permissions";

const optStr = z.string().max(2000).optional().nullable().transform((v) => (v === "" ? null : v));
const optInt = z.union([z.number(), z.string()]).optional().nullable().transform((v) => (v === "" || v == null ? null : Math.round(Number(v))));
const optDate = z.string().optional().nullable().transform((v) => (v ? new Date(v) : null));
const tags = z.union([z.array(z.string()), z.string()]).optional().transform((v) => (Array.isArray(v) ? v : (v ?? "").split(",").map((s) => s.trim()).filter(Boolean)));
const json = z.any().optional().transform((v) => { if (typeof v !== "string") return v ?? null; if (!v.trim()) return null; try { return JSON.parse(v); } catch { throw new Error("Invalid JSON"); } });

/** Simple CRUD resources managed through /api/v1/admin/r/[resource]. */
export const RESOURCES: Record<string, { model: string; perm: Permission; schema: z.ZodObject<any>; orderBy?: any }> = {
  categories: { model: "category", perm: "products.manage", orderBy: { sortOrder: "asc" }, schema: z.object({ name: z.string().min(1).max(80), slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, dashes"), image: optStr, sortOrder: z.coerce.number().int().default(0), isActive: z.boolean().default(true) }) },
  zones: { model: "deliveryZone", perm: "coupons.manage", orderBy: { sort: "asc" }, schema: z.object({ name: z.string().min(1).max(80), charge: z.coerce.number().int().min(0), sort: z.coerce.number().int().default(0), isActive: z.boolean().default(true) }) },
  coupons: { model: "coupon", perm: "coupons.manage", orderBy: { createdAt: "desc" }, schema: z.object({ code: z.string().min(2).max(40).transform((s) => s.toUpperCase().replace(/\s/g, "")), description: optStr, type: z.enum(["PERCENT", "FIXED", "FREE_DELIVERY"]), value: z.coerce.number().int().min(0).default(0), maxDiscount: optInt, minOrder: z.coerce.number().int().min(0).default(0), startsAt: optDate, endsAt: optDate, usageLimit: optInt, perUserLimit: optInt, productIds: tags, categoryIds: tags, isActive: z.boolean().default(true) }) },
  "cake-bases": { model: "cakeBase", perm: "cake.manage", orderBy: { sort: "asc" }, schema: z.object({ name: z.string().min(1).max(60), sort: z.coerce.number().int().default(0), isActive: z.boolean().default(true) }) },
  "cake-weights": { model: "cakeWeight", perm: "cake.manage", orderBy: { grams: "asc" }, schema: z.object({ grams: z.coerce.number().int().min(100).max(50000), label: z.string().min(1).max(20), sort: z.coerce.number().int().default(0) }) },
  "cake-options": { model: "cakeOption", perm: "cake.manage", orderBy: [{ kind: "asc" }, { sort: "asc" }], schema: z.object({ kind: z.enum(["FILLING", "DECORATION", "PRINT", "BOARD", "EXTRA", "SHAPE"]), name: z.string().min(1).max(80), price: z.coerce.number().int(), meta: json, sort: z.coerce.number().int().default(0), isActive: z.boolean().default(true) }) },
  gallery: { model: "galleryItem", perm: "products.manage", orderBy: { sort: "asc" }, schema: z.object({ title: z.string().min(1).max(120), image: z.string().min(1).max(500), description: optStr, tags, minWeightG: optInt, startPrice: optInt, sort: z.coerce.number().int().default(0), isPublished: z.boolean().default(true) }) },
  inventory: { model: "inventoryItem", perm: "inventory.manage", orderBy: { name: "asc" }, schema: z.object({ name: z.string().min(1).max(80), unit: z.string().min(1).max(20), reorderLevel: z.coerce.number().min(0), costPerUnit: z.coerce.number().min(0), isActive: z.boolean().default(true) }) },
  suppliers: { model: "supplier", perm: "inventory.manage", orderBy: { name: "asc" }, schema: z.object({ name: z.string().min(1).max(100), phone: optStr, address: optStr }) },
  "canned-replies": { model: "cannedReply", perm: "chat.use", schema: z.object({ title: z.string().min(1).max(60), body: z.string().min(1).max(1000) }) },
  reviews: { model: "review", perm: "reviews.manage", orderBy: { createdAt: "desc" }, schema: z.object({ isApproved: z.boolean() }) },
  roles: { model: "role", perm: "staff.manage", orderBy: { name: "asc" }, schema: z.object({ name: z.string().min(1).max(40), permissions: tags }) },
};
