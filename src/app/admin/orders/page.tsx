import Link from "next/link";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel, statusTone, ORDER_STATUSES, CUSTOM_STATUSES } from "@/lib/format";

type SP = Promise<{ type?: string; status?: string; q?: string; channel?: string; due?: string; page?: string }>;

export default async function Orders({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: any = {};
  if (sp.type) where.type = sp.type;
  if (sp.status) where.status = sp.status;
  if (sp.channel) where.channel = sp.channel;
  if (sp.q) where.OR = [{ code: { contains: sp.q, mode: "insensitive" } }, { customerName: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }];
  let orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50 });
  if (sp.due) orders = orders.filter((o) => o.total > o.paidAmount && !["CANCELLED", "REJECTED"].includes(o.status));
  const total = await db.order.count({ where });
  const statuses = sp.type === "CUSTOM" ? CUSTOM_STATUSES : ORDER_STATUSES;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{sp.type === "CUSTOM" ? "Custom cake orders" : "Orders"}</h1>
        <div className="flex gap-2"><Link href="/pos" className="btn-primary btn-sm">New POS sale</Link><a href={`/api/v1/admin/reports/orders?format=csv${sp.type ? "&type=" + sp.type : ""}`} className="btn-outline btn-sm">Export CSV</a></div>
      </div>
      <form className="card flex flex-wrap items-end gap-2 p-3">
        {sp.type && <input type="hidden" name="type" value={sp.type} />}
        <input name="q" defaultValue={sp.q} className="input !w-56 !py-2" placeholder="Code, name or phone" aria-label="Search" />
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-48 !py-2" aria-label="Status"><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
        <select name="channel" defaultValue={sp.channel ?? ""} className="input !w-36 !py-2" aria-label="Channel"><option value="">All channels</option><option>WEB</option><option>POS</option><option>APP</option></select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="due" value="1" defaultChecked={!!sp.due} className="accent-brand" /> Due only</label>
        <button className="btn-outline btn-sm">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Status</th><th>Payment</th><th className="text-right">Total</th><th className="text-right">Due</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted">No orders found.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand">{o.code}</Link><br /><span className="text-xs text-muted">{fmtDate(o.createdAt, true)}</span></td>
                <td>{o.customerName}<br /><span className="text-xs text-muted">{o.phone}</span></td>
                <td>{o.type === "CUSTOM" ? "Custom" : "Standard"} · {o.channel}<br /><span className="text-xs text-muted">{o.fulfillment}</span></td>
                <td><span className={`chip ${statusTone(o.status)}`}>{statusLabel(o.status)}</span></td>
                <td><span className={`chip ${statusTone(o.paymentStatus)}`}>{statusLabel(o.paymentStatus)}</span></td>
                <td className="text-right font-semibold">{tk(o.total)}</td>
                <td className="text-right">{o.total > o.paidAmount ? <b className="text-brand">{tk(o.total - o.paidAmount)}</b> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm text-muted">
        <span>{total} orders</span>
        <span className="flex gap-2">{page > 1 && <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as any)}`} className="btn-ghost btn-sm">← Prev</Link>}{page * 50 < total && <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as any)}`} className="btn-ghost btn-sm">Next →</Link>}</span>
      </div>
    </div>
  );
}
