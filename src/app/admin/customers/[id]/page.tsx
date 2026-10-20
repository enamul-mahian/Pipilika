import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel, statusTone } from "@/lib/format";
import { CustomerNotes } from "@/components/admin-misc";

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { createdAt: "desc" } }, designs: { orderBy: { createdAt: "desc" }, take: 6 }, conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 }, logins: { orderBy: { createdAt: "desc" }, take: 5 } } });
  if (!u || u.kind !== "CUSTOMER") notFound();
  const valid = u.orders.filter((o) => !["CANCELLED", "REJECTED"].includes(o.status));
  const spent = valid.reduce((a, o) => a + o.paidAmount, 0);
  const due = valid.reduce((a, o) => a + Math.max(0, o.total - o.paidAmount), 0);
  return (
    <div className="grid gap-6">
      <div><Link href="/admin/customers" className="text-sm text-muted">← Customers</Link><h1 className="text-3xl">{u.name}</h1><p className="text-sm text-muted">{u.phone} {u.email && `· ${u.email}`} · joined {fmtDate(u.createdAt)} {u.birthday && `· birthday ${u.birthday}`}</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Orders", String(valid.length)], ["Total paid", tk(spent)], ["Due", tk(due)], ["Avg. order", tk(valid.length ? Math.round(valid.reduce((a, o) => a + o.total, 0) / valid.length) : 0)]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-xs text-muted">{l}</p><p className="text-xl font-bold">{v}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="card overflow-x-auto">
          <h2 className="p-4 pb-0 font-body text-lg font-bold">Orders</h2>
          <table className="table"><thead><tr><th>Order</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Due</th></tr></thead><tbody>
            {u.orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand">{o.code}</Link><br /><span className="text-xs text-muted">{fmtDate(o.createdAt)}</span></td><td><span className={`chip ${statusTone(o.status)}`}>{statusLabel(o.status)}</span></td><td className="text-right">{tk(o.total)}</td><td className="text-right">{o.total > o.paidAmount ? tk(o.total - o.paidAmount) : "—"}</td></tr>)}
          </tbody></table>
        </div>
        <div className="grid content-start gap-4">
          <CustomerNotes id={u.id} notes={u.notes ?? ""} />
          <div className="card p-4 text-sm"><h2 className="mb-2 font-body text-lg font-bold">Addresses</h2>{u.addresses.length ? u.addresses.map((a) => <p key={a.id} className="mb-1">{a.label}: {a.line}{a.area ? `, ${a.area}` : ""}</p>) : <p className="text-muted">None saved.</p>}</div>
          <div className="card p-4 text-sm"><h2 className="mb-2 font-body text-lg font-bold">Chats</h2>{u.conversations.length ? u.conversations.map((c) => <Link key={c.id} href={`/admin/chats/${c.id}`} className="block text-brand">{fmtDate(c.lastMessageAt, true)} · {c.status}</Link>) : <p className="text-muted">No chats.</p>}</div>
          <div className="card p-4 text-sm"><h2 className="mb-2 font-body text-lg font-bold">Recent logins</h2>{u.logins.map((l) => <p key={l.id} className="text-muted">{fmtDate(l.createdAt, true)} · {l.method}</p>)}</div>
        </div>
      </div>
    </div>
  );
}
