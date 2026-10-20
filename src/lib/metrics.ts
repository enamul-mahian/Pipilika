import { db } from "./db";
import { accountBalances, ACCOUNTS } from "./ledger";

export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

const OPEN_DUE_EXCLUDE = ["CANCELLED", "REJECTED", "REFUNDED", "DRAFT", "DESIGN_SUBMITTED", "UNDER_REVIEW", "QUOTE_SENT"];

export async function dashboardMetrics() {
  const today = startOfDay(), month = startOfMonth();
  const [bal, todaySales, todayExp, monthSales, monthExp, monthPurch, dueOrders, ordersToday] = await Promise.all([
    accountBalances(db),
    db.payment.aggregate({ where: { status: "PAID", verifiedAt: { gte: today } }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { date: { gte: today } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "PAID", verifiedAt: { gte: month } }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { date: { gte: month } }, _sum: { amount: true } }),
    db.purchase.aggregate({ where: { date: { gte: month } }, _sum: { total: true } }),
    db.order.findMany({ where: { status: { notIn: OPEN_DUE_EXCLUDE } }, select: { total: true, paidAmount: true } }),
    db.order.count({ where: { createdAt: { gte: today } } }),
  ]);
  const b = (code: string) => bal.find((a) => a.code === code)?.balance ?? 0;
  const refunds = await db.refund.aggregate({ where: { createdAt: { gte: month } }, _sum: { amount: true } });
  const customerDue = dueOrders.reduce((a, o) => a + Math.max(0, o.total - o.paidAmount), 0);
  const supplierDue = b(ACCOUNTS.PAYABLE.code);
  const sales = monthSales._sum.amount ?? 0, exp = monthExp._sum.amount ?? 0, purch = monthPurch._sum.total ?? 0;
  return {
    todaySales: todaySales._sum.amount ?? 0,
    todayExpense: todayExp._sum.amount ?? 0,
    ordersToday,
    cash: b(ACCOUNTS.CASH.code),
    bank: b(ACCOUNTS.BANK.code),
    bkash: b(ACCOUNTS.BKASH.code),
    nagad: b(ACCOUNTS.NAGAD.code),
    qr: b(ACCOUNTS.BANGLA_QR.code),
    supplierDue,
    customerDue,
    monthPurchase: purch,
    monthSales: sales,
    monthExpense: exp,
    estimatedProfit: sales - exp - purch - (refunds._sum.amount ?? 0),
    receivable: customerDue,
    payable: supplierDue,
  };
}

/** Verified sales per day for the last N days. */
export async function salesByDay(days = 7) {
  const from = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
  const pays = await db.payment.findMany({ where: { status: "PAID", verifiedAt: { gte: from } }, select: { amount: true, verifiedAt: true } });
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getTime() + i * 86400000);
    const next = new Date(d.getTime() + 86400000);
    return { date: d, label: d.toLocaleDateString("en-GB", { weekday: "short" }), total: pays.filter((p) => p.verifiedAt! >= d && p.verifiedAt! < next).reduce((a, p) => a + p.amount, 0) };
  });
}
