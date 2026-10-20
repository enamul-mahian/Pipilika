import Link from "next/link";
import { db } from "@/lib/db";
import { tk, fmtDate } from "@/lib/format";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const where: any = { kind: "CUSTOMER", deletedAt: null };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }];
  const users = await db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { orders: { select: { total: true, paidAmount: true, status: true, createdAt: true } } } });
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Customers</h1>
      <form className="card flex gap-2 p-3"><input name="q" defaultValue={q} className="input !w-64 !py-2" placeholder="Name, phone or email" aria-label="Search" /><button className="btn-outline btn-sm">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Customer</th><th>Contact</th><th className="text-right">Orders</th><th className="text-right">Spent</th><th className="text-right">Due</th><th>Last order</th></tr></thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No customers found.</td></tr>}
            {users.map((u) => {
              const valid = u.orders.filter((o) => !["CANCELLED", "REJECTED"].includes(o.status));
              const last = u.orders.map((o) => o.createdAt).sort((a, b) => +b - +a)[0];
              const due = valid.reduce((a, o) => a + Math.max(0, o.total - o.paidAmount), 0);
              return (
                <tr key={u.id}>
                  <td><Link href={`/admin/customers/${u.id}`} className="font-semibold text-brand">{u.name}</Link>{u.marketingOptIn && <span className="chip ml-1 bg-green-100 text-green-800">opt-in</span>}</td>
                  <td>{u.phone}<br /><span className="text-xs text-muted">{u.email}</span></td>
                  <td className="text-right">{valid.length}</td>
                  <td className="text-right font-semibold">{tk(valid.reduce((a, o) => a + o.paidAmount, 0))}</td>
                  <td className="text-right">{due ? <b className="text-brand">{tk(due)}</b> : "—"}</td>
                  <td>{last ? fmtDate(last) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
