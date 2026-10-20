import Link from "next/link";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel, statusTone } from "@/lib/format";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountHome() {
  const u = (await getUser())!;
  const [orders, stats, quotes] = await Promise.all([
    db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.order.aggregate({ where: { userId: u.id, status: { notIn: ["CANCELLED", "REJECTED"] } }, _sum: { paidAmount: true }, _count: true }),
    db.order.count({ where: { userId: u.id, status: "QUOTE_SENT" } }),
  ]);
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4"><p className="text-sm text-muted">Orders</p><p className="text-2xl font-bold">{stats._count}</p></div>
        <div className="card p-4"><p className="text-sm text-muted">Total spent</p><p className="text-2xl font-bold">{tk(stats._sum.paidAmount)}</p></div>
        <div className="card p-4"><p className="text-sm text-muted">Quotes waiting</p><p className="text-2xl font-bold text-brand">{quotes}</p></div>
        <Link href="/custom-cake" className="card grid place-items-center bg-blush p-4 text-center font-semibold text-brand">🎂 Design a new cake</Link>
      </div>
      <section className="card p-5">
        <div className="flex items-center justify-between"><h2 className="font-body text-lg font-bold">Recent orders</h2><Link href="/account/orders" className="text-sm font-semibold text-brand">View all →</Link></div>
        {orders.length === 0 ? <p className="mt-3 text-muted">No orders yet. <Link href="/shop" className="text-brand underline">Start shopping</Link></p> : (
          <ul className="mt-3 divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}><Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-brand">
                <span><b>{o.code}</b> <span className="text-sm text-muted">· {fmtDate(o.createdAt)} {o.type === "CUSTOM" && "· Custom cake"}</span></span>
                <span className="flex items-center gap-2"><span className={`chip ${statusTone(o.status)}`}>{statusLabel(o.status)}</span><b>{tk(o.total)}</b></span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
