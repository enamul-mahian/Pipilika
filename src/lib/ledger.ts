import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

// Chart of accounts (codes are stable; names editable).
export const ACCOUNTS = {
  CASH: { code: "1000", name: "Cash in Hand", type: "ASSET" },
  BKASH: { code: "1010", name: "bKash Merchant", type: "ASSET" },
  NAGAD: { code: "1011", name: "Nagad Merchant", type: "ASSET" },
  BANK: { code: "1020", name: "Bank Account", type: "ASSET" },
  BANGLA_QR: { code: "1030", name: "Bangla QR Settlement", type: "ASSET" },
  CARD: { code: "1040", name: "Card Settlement", type: "ASSET" },
  INVENTORY: { code: "1200", name: "Inventory / Raw Materials", type: "ASSET" },
  PAYABLE: { code: "2000", name: "Supplier Payable", type: "LIABILITY" },
  SALES: { code: "4000", name: "Sales Income", type: "INCOME" },
  REFUNDS: { code: "4900", name: "Refunds", type: "EXPENSE" },
  CAPITAL: { code: "3000", name: "Owner Capital", type: "EQUITY" },
} as const;

export const EXPENSE_CATEGORIES = ["Salaries", "Rent", "Utilities", "Marketing", "Delivery", "Packaging", "Maintenance", "Miscellaneous"];
const expenseCode = (cat: string) => "6" + String(Math.max(0, EXPENSE_CATEGORIES.indexOf(cat))).padStart(3, "0");

/** Payment method -> asset account key. COD collected = cash. */
export const methodAccount = (m: string): keyof typeof ACCOUNTS =>
  m === "BKASH" ? "BKASH" : m === "NAGAD" ? "NAGAD" : m === "BANK" ? "BANK" : m === "BANGLA_QR" ? "BANGLA_QR" : m === "CARD" ? "CARD" : "CASH";

async function account(tx: Tx, key: keyof typeof ACCOUNTS | { code: string; name: string; type: string }) {
  const a = typeof key === "string" ? ACCOUNTS[key] : key;
  return tx.ledgerAccount.upsert({ where: { code: a.code }, create: a, update: {} });
}

export type Line = { account: keyof typeof ACCOUNTS | { code: string; name: string; type: string }; debit?: number; credit?: number; partyType?: string; partyId?: string };

/** Validates debits == credits (pure). */
export function assertBalanced(lines: { debit?: number; credit?: number }[]) {
  const d = lines.reduce((a, l) => a + (l.debit ?? 0), 0);
  const c = lines.reduce((a, l) => a + (l.credit ?? 0), 0);
  if (d !== c) throw new Error(`Unbalanced voucher: debit ${d} != credit ${c}`);
  if (d <= 0) throw new Error("Voucher amount must be positive");
}

export async function postVoucher(
  tx: Tx,
  v: { type: "RECEIPT" | "PAYMENT" | "JOURNAL"; narration: string; refType?: string; refId?: string; byId?: string | null; date?: Date },
  lines: Line[],
) {
  assertBalanced(lines);
  const count = await tx.voucher.count();
  const prefix = v.type === "RECEIPT" ? "RV" : v.type === "PAYMENT" ? "PV" : "JV";
  const no = `${prefix}-${String(count + 1).padStart(5, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const entries = [];
  for (const l of lines) {
    const acc = await account(tx, l.account);
    entries.push({ accountId: acc.id, debit: l.debit ?? 0, credit: l.credit ?? 0, partyType: l.partyType, partyId: l.partyId });
  }
  return tx.voucher.create({
    data: { no, type: v.type, narration: v.narration, refType: v.refType, refId: v.refId, byId: v.byId ?? null, date: v.date, entries: { create: entries } },
  });
}

// --- Business events -> ledger impact ---
export const ledger = {
  saleReceipt: (tx: Tx, p: { amount: number; method: string; orderCode: string; orderId: string; byId?: string | null }) =>
    postVoucher(tx, { type: "RECEIPT", narration: `Payment received for ${p.orderCode} (${p.method})`, refType: "order", refId: p.orderId, byId: p.byId }, [
      { account: methodAccount(p.method), debit: p.amount },
      { account: "SALES", credit: p.amount, partyType: "order", partyId: p.orderId },
    ]),
  refund: (tx: Tx, p: { amount: number; method: string; orderCode: string; orderId: string; byId?: string | null }) =>
    postVoucher(tx, { type: "PAYMENT", narration: `Refund for ${p.orderCode}`, refType: "order", refId: p.orderId, byId: p.byId }, [
      { account: "REFUNDS", debit: p.amount },
      { account: methodAccount(p.method), credit: p.amount },
    ]),
  purchase: (tx: Tx, p: { total: number; supplierId: string; purchaseId: string; supplierName: string; byId?: string | null }) =>
    postVoucher(tx, { type: "JOURNAL", narration: `Purchase from ${p.supplierName}`, refType: "purchase", refId: p.purchaseId, byId: p.byId }, [
      { account: "INVENTORY", debit: p.total },
      { account: "PAYABLE", credit: p.total, partyType: "supplier", partyId: p.supplierId },
    ]),
  supplierPayment: (tx: Tx, p: { amount: number; method: string; supplierId: string; supplierName: string; refId: string; byId?: string | null }) =>
    postVoucher(tx, { type: "PAYMENT", narration: `Paid supplier ${p.supplierName}`, refType: "supplier_payment", refId: p.refId, byId: p.byId }, [
      { account: "PAYABLE", debit: p.amount, partyType: "supplier", partyId: p.supplierId },
      { account: methodAccount(p.method), credit: p.amount },
    ]),
  expense: (tx: Tx, p: { amount: number; method: string; category: string; expenseId: string; note?: string | null; byId?: string | null }) =>
    postVoucher(tx, { type: "PAYMENT", narration: `${p.category} expense${p.note ? ": " + p.note : ""}`, refType: "expense", refId: p.expenseId, byId: p.byId }, [
      { account: { code: expenseCode(p.category), name: `${p.category} Expense`, type: "EXPENSE" }, debit: p.amount },
      { account: methodAccount(p.method), credit: p.amount },
    ]),
};

/** Balance per account: assets/expenses = debit - credit, others = credit - debit. */
export async function accountBalances(tx: Tx, until?: Date) {
  const accounts = await tx.ledgerAccount.findMany({ orderBy: { code: "asc" } });
  const sums = await tx.ledgerEntry.groupBy({
    by: ["accountId"],
    _sum: { debit: true, credit: true },
    where: until ? { createdAt: { lte: until } } : undefined,
  });
  return accounts.map((a) => {
    const s = sums.find((x) => x.accountId === a.id);
    const d = s?._sum.debit ?? 0, c = s?._sum.credit ?? 0;
    return { ...a, debit: d, credit: c, balance: a.type === "ASSET" || a.type === "EXPENSE" ? d - c : c - d };
  });
}
