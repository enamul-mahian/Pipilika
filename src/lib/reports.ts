import { db } from "./db";
import { accountBalances } from "./ledger";

export const REPORTS = {
  sales: "Daily sales",
  orders: "Orders",
  products: "Product sales",
  payments: "Payment methods",
  expenses: "Expenses",
  pnl: "Profit & loss",
  stock: "Low stock",
  customers: "Top customers",
  attribution: "Traffic & attribution",
} as const;
export type ReportType = keyof typeof REPORTS;
export type Report = { title: string; columns: string[]; rows: (string | number)[][]; totals?: (string | number)[] };

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Builds a tabular report for the date range [from, to]. Money is whole taka. */
export async function buildReport(type: ReportType, from: Date, to: Date, filter: { type?: string } = {}): Promise<Report> {
  const range = { gte: from, lte: to };
  switch (type) {
    case "sales": {
      const pays = await db.payment.findMany({ where: { status: "PAID", verifiedAt: range }, select: { amount: true, verifiedAt: true, orderId: true } });
      const map = new Map<string, { n: number; amt: number }>();
      for (const p of pays) { const k = day(p.verifiedAt!); const m = map.get(k) ?? { n: 0, amt: 0 }; m.n++; m.amt += p.amount; map.set(k, m); }
      const rows = [...map.entries()].sort().map(([d, m]) => [d, m.n, m.amt]);
      return { title: REPORTS.sales, columns: ["Date", "Payments", "Amount (৳)"], rows, totals: ["Total", pays.length, pays.reduce((a, p) => a + p.amount, 0)] };
    }
    case "orders": {
      const orders = await db.order.findMany({ where: { createdAt: range, ...(filter.type ? { type: filter.type } : {}) }, orderBy: { createdAt: "desc" }, take: 5000 });
      return {
        title: REPORTS.orders, columns: ["Code", "Date", "Customer", "Phone", "Type", "Channel", "Status", "Total", "Paid", "Due", "Payment"],
        rows: orders.map((o) => [o.code, day(o.createdAt), o.customerName, o.phone, o.type, o.channel, o.status, o.total, o.paidAmount, Math.max(0, o.total - o.paidAmount), o.paymentStatus]),
        totals: ["Total", orders.length, "", "", "", "", "", orders.reduce((a, o) => a + o.total, 0), orders.reduce((a, o) => a + o.paidAmount, 0), "", ""],
      };
    }
    case "products": {
      const items = await db.orderItem.findMany({ where: { order: { createdAt: range, status: { notIn: ["CANCELLED", "REJECTED", "DRAFT"] } } }, select: { name: true, qty: true, lineTotal: true } });
      const map = new Map<string, { q: number; amt: number }>();
      for (const i of items) { const m = map.get(i.name) ?? { q: 0, amt: 0 }; m.q += i.qty; m.amt += i.lineTotal; map.set(i.name, m); }
      const rows = [...map.entries()].sort((a, b) => b[1].amt - a[1].amt).map(([n, m]) => [n, m.q, m.amt]);
      return { title: REPORTS.products, columns: ["Product", "Qty sold", "Revenue (৳)"], rows, totals: ["Total", rows.reduce((a, r) => a + (r[1] as number), 0), rows.reduce((a, r) => a + (r[2] as number), 0)] };
    }
    case "payments": {
      const g = await db.payment.groupBy({ by: ["method"], where: { status: "PAID", verifiedAt: range }, _sum: { amount: true }, _count: true });
      const rows = g.sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0)).map((x) => [x.method, x._count, x._sum.amount ?? 0]);
      return { title: REPORTS.payments, columns: ["Method", "Count", "Amount (৳)"], rows, totals: ["Total", rows.reduce((a, r) => a + (r[1] as number), 0), rows.reduce((a, r) => a + (r[2] as number), 0)] };
    }
    case "expenses": {
      const ex = await db.expense.findMany({ where: { date: range }, orderBy: { date: "desc" } });
      return { title: REPORTS.expenses, columns: ["Date", "Category", "Method", "Note", "Amount (৳)"], rows: ex.map((e) => [day(e.date), e.category, e.method, e.note ?? "", e.amount]), totals: ["Total", "", "", "", ex.reduce((a, e) => a + e.amount, 0)] };
    }
    case "pnl": {
      const [sales, refunds, ex, purch] = await Promise.all([
        db.payment.aggregate({ where: { status: "PAID", verifiedAt: range }, _sum: { amount: true } }),
        db.refund.aggregate({ where: { createdAt: range }, _sum: { amount: true } }),
        db.expense.groupBy({ by: ["category"], where: { date: range }, _sum: { amount: true } }),
        db.purchase.aggregate({ where: { date: range }, _sum: { total: true } }),
      ]);
      const s = sales._sum.amount ?? 0, r = refunds._sum.amount ?? 0, p = purch._sum.total ?? 0;
      const exTotal = ex.reduce((a, e) => a + (e._sum.amount ?? 0), 0);
      const rows: (string | number)[][] = [["Sales received", s], ["Less: refunds", -r], ["Net sales", s - r], ["Raw material purchases", -p], ["Gross profit", s - r - p]];
      for (const e of ex) rows.push([`Expense: ${e.category}`, -(e._sum.amount ?? 0)]);
      return { title: REPORTS.pnl, columns: ["Item", "Amount (৳)"], rows, totals: ["Net profit (cash basis)", s - r - p - exTotal] };
    }
    case "stock": {
      const items = await db.inventoryItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
      const low = items.filter((i) => i.stock <= i.reorderLevel);
      return { title: REPORTS.stock, columns: ["Item", "Stock", "Unit", "Reorder level", "Value (৳)"], rows: low.map((i) => [i.name, i.stock, i.unit, i.reorderLevel, Math.round(i.stock * i.costPerUnit)]) };
    }
    case "customers": {
      const g = await db.order.groupBy({ by: ["phone", "customerName"], where: { createdAt: range, status: { notIn: ["CANCELLED", "REJECTED", "DRAFT"] } }, _sum: { total: true }, _count: true, orderBy: { _sum: { total: "desc" } }, take: 100 });
      return { title: REPORTS.customers, columns: ["Customer", "Phone", "Orders", "Spent (৳)"], rows: g.map((x) => [x.customerName, x.phone, x._count, x._sum.total ?? 0]) };
    }
    case "attribution": {
      const [events, orders] = await Promise.all([
        db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: range }, _count: true }),
        db.order.groupBy({ by: ["source"], where: { createdAt: range }, _count: true, _sum: { total: true } }),
      ]);
      const rows: (string | number)[][] = [
        ...events.map((e) => [`Event: ${e.name}`, e._count, ""]),
        ...orders.map((o) => [`Orders from: ${o.source ?? "direct"}`, o._count, o._sum.total ?? 0]),
      ];
      return { title: REPORTS.attribution, columns: ["Metric", "Count", "Revenue (৳)"], rows };
    }
  }
}

export async function trialBalance() {
  return (await accountBalances(db)).filter((a) => a.debit || a.credit);
}

export const toCsv = (r: Report) =>
  "﻿" + [r.columns, ...r.rows, ...(r.totals ? [r.totals] : [])].map((row) => row.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");

export function parseRange(sp: { from?: string; to?: string }) {
  const to = sp.to ? new Date(sp.to + "T23:59:59") : new Date();
  const from = sp.from ? new Date(sp.from + "T00:00:00") : new Date(to.getTime() - 29 * 86400000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}
