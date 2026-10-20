import { describe, expect, it } from "vitest";
import { assertBalanced, methodAccount } from "@/lib/ledger";

describe("ledger", () => {
  it("accepts balanced vouchers", () => {
    expect(() => assertBalanced([{ debit: 500 }, { credit: 300 }, { credit: 200 }])).not.toThrow();
  });
  it("rejects unbalanced or zero vouchers", () => {
    expect(() => assertBalanced([{ debit: 500 }, { credit: 400 }])).toThrow(/Unbalanced/);
    expect(() => assertBalanced([{ debit: 0 }, { credit: 0 }])).toThrow(/positive/);
  });
  it("maps payment methods to asset accounts", () => {
    expect(methodAccount("BKASH")).toBe("BKASH");
    expect(methodAccount("COD")).toBe("CASH");
    expect(methodAccount("BANGLA_QR")).toBe("BANGLA_QR");
  });
});
