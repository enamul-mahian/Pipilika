import { describe, expect, it } from "vitest";
import { evaluateCoupon, type CouponRow } from "@/lib/coupons";

const base: CouponRow = { code: "X", type: "PERCENT", value: 10, minOrder: 0, usedCount: 0, productIds: [], categoryIds: [], isActive: true };
const lines = [{ productId: "a", categoryId: "cakes", lineTotal: 1000 }, { productId: "b", categoryId: "cookies", lineTotal: 500 }];

describe("evaluateCoupon", () => {
  it("applies percent with cap", () => {
    expect(evaluateCoupon(base, lines, 100, 0)).toMatchObject({ ok: true, discount: 150 });
    expect(evaluateCoupon({ ...base, maxDiscount: 100 }, lines, 100, 0)).toMatchObject({ ok: true, discount: 100 });
  });
  it("applies fixed and free delivery", () => {
    expect(evaluateCoupon({ ...base, type: "FIXED", value: 200 }, lines, 100, 0)).toMatchObject({ ok: true, discount: 200 });
    expect(evaluateCoupon({ ...base, type: "FREE_DELIVERY" }, lines, 120, 0)).toMatchObject({ ok: true, discount: 120, freeDelivery: true });
  });
  it("scopes to categories / products", () => {
    expect(evaluateCoupon({ ...base, categoryIds: ["cakes"] }, lines, 0, 0)).toMatchObject({ ok: true, discount: 100 });
    expect(evaluateCoupon({ ...base, productIds: ["zzz"] }, lines, 0, 0).ok).toBe(false);
  });
  it("rejects expired, not-started, over-limit and below-minimum", () => {
    const now = new Date("2026-05-01");
    expect(evaluateCoupon({ ...base, endsAt: new Date("2026-04-01") }, lines, 0, 0, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, startsAt: new Date("2026-06-01") }, lines, 0, 0, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, usageLimit: 5, usedCount: 5 }, lines, 0, 0).ok).toBe(false);
    expect(evaluateCoupon({ ...base, perUserLimit: 1 }, lines, 0, 1).ok).toBe(false);
    expect(evaluateCoupon({ ...base, minOrder: 2000 }, lines, 0, 0).ok).toBe(false);
    expect(evaluateCoupon(null, lines, 0, 0).ok).toBe(false);
    expect(evaluateCoupon({ ...base, isActive: false }, lines, 0, 0).ok).toBe(false);
  });
});
