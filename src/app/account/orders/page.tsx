import Link from "next/link";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel, statusTone } from "@/lib/format";

export default async function MyOrders({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = (await getUser())!;
  const tab = (await searchParams).tab ?? "ongoing";
  const done = ["DELIVERED", "CLOSED"], cancelled = ["CANCELLED", "REJECTED", "REFUNDED"];
  const where = tab === "completed" ? { status: { in: done } } : tab === "cancelled" ? { status: { in: cancelled } } : { status: { notIn: [...done, ...cancelled] } };
  const orders = await db.order.findMany({ where: { userId: u.id, ...where }, orderBy: { createdAt: "desc" }, include: { items: { take: 1 } } });
  return (
    <div>
      <h1 className="text-3xl">My orders</h1>
      <div className="mt-4 flex gap-2">{["ongoing", "completed", "cancelled"].map((t) => <Link key={t} href={`?tab=${t}`} className={`tab border border-line capitalize ${tab === t ? "tab-on" : ""}`}>{t}</Link>)}</div>
      {orders.length === 0 ? <p className="mt-6 text-muted">Nothing here yet.</p> : (
        <ul className="mt-4 grid gap-3">
          {orders.map((o) => (
            <li key={o.id} className="card flex flex-wrap items-center gap-3 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.items[0]?.image ?? (o.type === "CUSTOM" ? "/demo/cake-ayan.jpg" : "/demo/pastries.jpg")} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.items[0]?.name ?? "Order"} </p>
                <p className="text-sm text-muted">{o.code} · {fmtDate(o.createdAt)}</p>
              </div>
              <span className={`chip ${statusTone(o.status)}`}>{statusLabel(o.status)}</span>
              <b>{tk(o.total)}</b>
              <Link href={`/account/orders/${o.id}`} className="btn-outline btn-sm">{o.status === "QUOTE_SENT" ? "Review quote" : "Track"}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
