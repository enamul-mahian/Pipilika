import Link from "next/link";
import { db } from "@/lib/db";
import { dashboardMetrics, salesByDay } from "@/lib/metrics";
import { tk, fmtDate, statusLabel, statusTone } from "@/lib/format";
import { AreaChart } from "@/components/charts";

export default async function Dashboard() {
  const [m, week, recent, lowStock, pending, custom] = await Promise.all([
    dashboardMetrics(),
    salesByDay(7),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.$queryRaw<{ id: string; name: string; stock: number; reorderLevel: number; unit: string }[]>`SELECT id, name, stock, "reorderLevel", unit FROM "InventoryItem" WHERE "isActive" AND stock <= "reorderLevel" ORDER BY name`,
    db.payment.count({ where: { status: "VERIFICATION_REQUIRED" } }),
    db.order.count({ where: { type: "CUSTOM", status: { in: ["DESIGN_SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);
  const cards: [string, number, string?][] = [
    ["Today sales", m.todaySales], ["Today expense", m.todayExpense], ["Cash in hand", m.cash], ["Bank balance", m.bank],
    ["bKash balance", m.bkash], ["Supplier due", m.supplierDue, "/admin/purchases"], ["Customer due", m.customerDue, "/admin/orders?due=1"], ["Purchases (month)", m.monthPurchase],
    ["Sales (month)", m.monthSales], ["Expenses (month)", m.monthExpense], ["Est. profit (month)", m.estimatedProfit, "/admin/accounts"], ["Receivable / Payable", m.receivable - m.payable],
  ];
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Dashboard</h1>
        <div className="flex gap-2"><Link href="/pos" className="btn-primary">Open POS</Link><Link href="/admin/products/new" className="btn-outline">Add product</Link></div>
      </div>
      {(pending > 0 || custom > 0 || lowStock.length > 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {pending > 0 && <Link href="/admin/payments" className="chip !px-3 !py-1.5 bg-amber-100 text-amber-900">{pending} payment(s) to verify →</Link>}
          {custom > 0 && <Link href="/admin/orders?type=CUSTOM" className="chip !px-3 !py-1.5 bg-blush text-brand">{custom} custom design(s) to review →</Link>}
          {lowStock.length > 0 && <Link href="/admin/inventory" className="chip !px-3 !py-1.5 bg-red-100 text-red-700">{lowStock.length} item(s) low on stock →</Link>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, v, href]) => {
          const inner = <><p className="text-xs text-muted">{label}</p><p className={`text-xl font-bold ${v < 0 ? "text-red-700" : ""}`}>{tk(v)}</p></>;
          return href ? <Link key={label} href={href} className="card p-4 hover:border-brand">{inner}</Link> : <div key={label} className="card p-4">{inner}</div>;
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5"><h2 className="mb-2 font-body font-bold">Sales this week</h2><AreaChart data={week} /><p className="text-sm text-muted">Orders today: {m.ordersToday}</p></section>
        <section className="card p-5">
          <h2 className="mb-2 font-body font-bold">Low stock</h2>
          {lowStock.length === 0 ? <p className="text-sm text-muted">All good 👍</p> : <ul className="grid gap-1 text-sm">{lowStock.map((i) => <li key={i.id} className="flex justify-between"><span>{i.name}</span><b className="text-red-700">{i.stock} {i.unit} (min {i.reorderLevel})</b></li>)}</ul>}
        </section>
      </div>
      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between p-4"><h2 className="font-body font-bold">Recent orders</h2><Link href="/admin/orders" className="text-sm font-semibold text-brand">All orders →</Link></div>
        <table className="table">
          <thead><tr><th>Order</th><th>Customer</th><th>Channel</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
          <tbody>{recent.map((o) => (
            <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand">{o.code}</Link><br /><span className="text-xs text-muted">{fmtDate(o.createdAt, true)}</span></td><td>{o.customerName}<br /><span className="text-xs text-muted">{o.phone}</span></td><td>{o.channel}{o.type === "CUSTOM" && " · Custom"}</td><td><span className={`chip ${statusTone(o.status)}`}>{statusLabel(o.status)}</span></td><td><span className={`chip ${statusTone(o.paymentStatus)}`}>{statusLabel(o.paymentStatus)}</span></td><td className="text-right font-semibold">{tk(o.total)}</td></tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  );
}
