export const tk = (n: number | null | undefined) =>
  "৳" + Math.round(n ?? 0).toLocaleString("en-IN");

export const fmtDate = (d: Date | string | null | undefined, withTime = false) => {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Dhaka",
  });
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9ঀ-৿]+/g, "-").replace(/^-+|-+$/g, "") || "item";

export const weightLabel = (g?: number | null) =>
  !g ? "—" : g >= 1000 ? `${+(g / 1000).toFixed(2)} kg` : `${g} g`;

export const ORDER_STATUSES = [
  "PLACED", "CONFIRMED", "PREPARING", "BAKING", "DECORATING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CLOSED",
  "CANCELLED", "REFUNDED",
] as const;

export const CUSTOM_STATUSES = [
  "DRAFT", "DESIGN_SUBMITTED", "UNDER_REVIEW", "QUOTE_SENT", "CUSTOMER_APPROVED", "PAYMENT_PENDING",
  "ADVANCE_PAID", "PAID", "BAKING", "DECORATING", "FINAL_PRICE_SET", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CLOSED",
  "REJECTED", "CANCELLED", "REFUNDED",
] as const;

export const statusLabel = (s: string) =>
  s.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export const statusTone = (s: string) => {
  if (["DELIVERED", "CLOSED", "PAID", "APPROVED", "RESOLVED"].includes(s)) return "bg-green-100 text-green-800";
  if (["CANCELLED", "REJECTED", "FAILED", "REFUNDED"].includes(s)) return "bg-red-100 text-red-700";
  if (["VERIFICATION_REQUIRED", "QUOTE_SENT", "PAYMENT_PENDING", "PARTIALLY_PAID", "WAITING"].includes(s)) return "bg-amber-100 text-amber-800";
  return "bg-blush text-brand";
};

export const PAYMENT_METHODS: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  BANGLA_QR: "Bangla QR",
  BANK: "Bank Transfer",
  CARD: "Card",
  COD: "Cash on Delivery",
  CASH: "Cash",
};
