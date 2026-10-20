// Pure coupon evaluation. DB lookups (usage counts) are passed in.
export type CouponRow = {
  code: string; type: string; value: number; maxDiscount?: number | null; minOrder: number;
  startsAt?: Date | null; endsAt?: Date | null; usageLimit?: number | null; perUserLimit?: number | null;
  usedCount: number; productIds: string[]; categoryIds: string[]; isActive: boolean;
};
export type CartLine = { productId?: string | null; categoryId?: string | null; lineTotal: number };

export function evaluateCoupon(
  c: CouponRow | null,
  lines: CartLine[],
  deliveryCharge: number,
  userUses: number,
  now = new Date(),
): { ok: true; discount: number; freeDelivery: boolean; message: string } | { ok: false; message: string } {
  if (!c || !c.isActive) return { ok: false, message: "Invalid coupon code" };
  if (c.startsAt && now < c.startsAt) return { ok: false, message: "This coupon is not active yet" };
  if (c.endsAt && now > c.endsAt) return { ok: false, message: "This coupon has expired" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, message: "This coupon has reached its usage limit" };
  if (c.perUserLimit != null && userUses >= c.perUserLimit) return { ok: false, message: "You have already used this coupon" };
  const scoped = c.productIds.length || c.categoryIds.length;
  const eligible = lines.filter(
    (l) => !scoped || (l.productId && c.productIds.includes(l.productId)) || (l.categoryId && c.categoryIds.includes(l.categoryId)),
  );
  const eligibleTotal = eligible.reduce((a, l) => a + l.lineTotal, 0);
  const cartTotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  if (cartTotal < c.minOrder) return { ok: false, message: `Minimum order ৳${c.minOrder} for this coupon` };
  if (scoped && eligibleTotal === 0) return { ok: false, message: "This coupon doesn't apply to items in your cart" };
  if (c.type === "FREE_DELIVERY") return { ok: true, discount: deliveryCharge, freeDelivery: true, message: "Free delivery applied" };
  let d = c.type === "PERCENT" ? Math.round((eligibleTotal * c.value) / 100) : Math.min(c.value, eligibleTotal);
  if (c.maxDiscount != null) d = Math.min(d, c.maxDiscount);
  return { ok: true, discount: d, freeDelivery: false, message: `You saved ৳${d}` };
}
