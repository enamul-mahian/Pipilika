import { describe, expect, it } from "vitest";
import { normalizeTarget } from "@/lib/otp";

describe("normalizeTarget", () => {
  it("normalises Bangladeshi phone numbers", () => {
    expect(normalizeTarget("01711-111111")).toMatchObject({ channel: "phone", target: "01711111111" });
    expect(normalizeTarget("+8801711111111").target).toBe("01711111111");
  });
  it("accepts emails and rejects junk", () => {
    expect(normalizeTarget("A@B.com")).toMatchObject({ channel: "email", target: "a@b.com" });
    expect(() => normalizeTarget("12345")).toThrow();
  });
});
