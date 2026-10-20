import { describe, expect, it } from "vitest";
import { priceProduct, priceCake, basePriceFor, PricingError, type PProduct } from "@/lib/pricing";

const pizza: PProduct = {
  id: "p1", name: "Pizza", basePrice: 0, minQty: 1,
  variants: [{ id: "s", name: "Small", price: 500 }, { id: "l", name: "Large", price: 900 }],
  modifiers: [
    { id: "crust", name: "Crust", type: "SINGLE", required: true, minSelect: 1, options: [{ id: "thin", name: "Thin", priceDelta: 0 }, { id: "cheese", name: "Cheese burst", priceDelta: 150, rules: { onlyForVariants: ["Large"] } }] },
    { id: "top", name: "Toppings", type: "MULTI", required: false, minSelect: 0, maxSelect: 2, options: [{ id: "beef", name: "Beef", priceDelta: 120 }, { id: "veg", name: "Vegetable", priceDelta: 60, rules: { excludes: ["Beef"] } }, { id: "olive", name: "Olive", priceDelta: 40 }] },
    { id: "extra", name: "Extra cheese", type: "QUANTITY", required: false, minSelect: 0, options: [{ id: "x", name: "Cheese", priceDelta: 50 }] },
    { id: "msg", name: "Message", type: "TEXT", required: false, minSelect: 0, options: [] },
  ],
};

describe("priceProduct", () => {
  it("prices variant + modifiers × qty", () => {
    const r = priceProduct(pizza, { variantId: "l", qty: 2, options: { crust: ["cheese"], top: ["beef", "olive"], extra: { x: 2 }, msg: "Hi" } });
    expect(r.unitPrice).toBe(900 + 150 + 120 + 40 + 100);
    expect(r.lineTotal).toBe(r.unitPrice * 2);
    expect(r.modifiers.find((m) => m.text)?.text).toBe("Hi");
  });
  it("requires a variant and required groups", () => {
    expect(() => priceProduct(pizza, { qty: 1, options: { crust: ["thin"] } })).toThrow(PricingError);
    expect(() => priceProduct(pizza, { variantId: "s", qty: 1, options: {} })).toThrow(/Crust/);
  });
  it("enforces variant-only options, max select and exclusions", () => {
    expect(() => priceProduct(pizza, { variantId: "s", qty: 1, options: { crust: ["cheese"] } })).toThrow(/not available/);
    expect(() => priceProduct(pizza, { variantId: "s", qty: 1, options: { crust: ["thin"], top: ["beef", "olive", "veg"] } })).toThrow(/max 2/);
    expect(() => priceProduct(pizza, { variantId: "s", qty: 1, options: { crust: ["thin"], top: ["beef", "veg"] } })).toThrow(/cannot be combined/);
  });
  it("enforces minimum quantity", () => {
    expect(() => priceProduct({ ...pizza, minQty: 6 }, { variantId: "s", qty: 2, options: { crust: ["thin"] } })).toThrow(/Minimum/);
  });
});

const cfg = {
  basePrices: [{ baseId: "v", grams: 1000, price: 1200 }, { baseId: "v", grams: 2000, price: 2200 }],
  options: [{ id: "f", kind: "FILLING", name: "Nutella", price: 300, meta: { perKg: true } }, { id: "b", kind: "BOARD", name: "Gold", price: 150 }, { id: "sh", kind: "SHAPE", name: "Heart", price: 400 }],
};

describe("priceCake", () => {
  it("interpolates custom weights and extrapolates", () => {
    expect(basePriceFor(cfg, "v", 1500)).toBe(1700);
    expect(basePriceFor(cfg, "v", 500)).toBe(600);
  });
  it("adds per-kg and flat options plus shape surcharge and delivery", () => {
    const r = priceCake(cfg, { baseId: "v", grams: 2000, fillingIds: ["f"], boardId: "b", shapeId: "sh", deliveryCharge: 100 });
    expect(r.breakdown).toMatchObject({ base: 2200, filling: 600, board: 150, shape: 400 });
    expect(r.total).toBe(2200 + 600 + 150 + 400 + 100);
  });
  it("respects shape surcharge override and minimum weight", () => {
    expect(priceCake(cfg, { baseId: "v", grams: 1000, shapeId: "sh", shapeSurchargeOverride: 0 }).subtotal).toBe(1200);
    expect(() => priceCake(cfg, { baseId: "v", grams: 1000, minWeightG: 2000 })).toThrow(/at least/);
  });
});
