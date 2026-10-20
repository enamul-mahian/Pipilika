import Link from "next/link";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel, statusTone, PAYMENT_METHODS } from "@/lib/format";
import { PaymentVerify } from "@/components/admin-payment-verify";

export default async function Payments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "VERIFICATION_REQUIRED";
  const list = await db.payment.findMany({ where: status === "ALL" ? {} : { status }, orderBy: { createdAt: "desc" }, take: 100, include: { order: { select: { id: true, code: true, customerName: true, total: true, paidAmount: true } } } });
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Payments</h1>
      <div className="flex flex-wrap gap-2">{["VERIFICATION_REQUIRED", "PAID", "FAILED", "ALL"].map((s) => <Link key={s} href={`?status=${s}`} className={`tab border border-line ${status === s ? "tab-on" : ""}`}>{statusLabel(s)}</Link>)}</div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Date</th><th>Order</th><th>Method</th><th>TrxID / proof</th><th className="text-right">Amount</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted">Nothing to show.</td></tr>}
            {list.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.createdAt, true)}</td>
                <td>{p.order ? <Link href={`/admin/orders/${p.order.id}`} className="font-semibold text-brand">{p.order.code}</Link> : "—"}<br /><span className="text-xs text-muted">{p.order?.customerName}</span></td>
                <td>{PAYMENT_METHODS[p.method] ?? p.method}<br /><span className="text-xs text-muted">{p.kind}</span></td>
                <td>{p.trxId ? <code>{p.trxId}</code> : "—"} {p.proofKey && <a href={`/api/v1/files/${p.proofKey}`} target="_blank" className="text-brand underline">view proof</a>}</td>
                <td className="text-right font-semibold">{tk(p.amount)}</td>
                <td><span className={`chip ${statusTone(p.status)}`}>{statusLabel(p.status)}</span></td>
                <td>{p.status === "VERIFICATION_REQUIRED" && <PaymentVerify id={p.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
