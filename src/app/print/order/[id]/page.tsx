import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { tk, fmtDate, PAYMENT_METHODS } from "@/lib/format";
import { AutoPrint } from "@/components/auto-print";

export const metadata = { title: "Invoice", robots: { index: false } };

export default async function PrintOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ receipt?: string; t?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, payments: { where: { status: "PAID" } }, refunds: true } });
  if (!o) notFound();
  const staff = await getStaff();
  if (!staff && (!sp.t || sp.t !== o.shareToken)) notFound();
  const s = await getSettings();
  const receipt = !!sp.receipt;
  return (
    <div className={`mx-auto bg-white p-6 text-ink ${receipt ? "max-w-[80mm] p-2 text-xs" : "max-w-3xl"}`}>
      <AutoPrint />
      <div className={`flex items-center ${receipt ? "flex-col text-center" : "justify-between"} gap-3 border-b border-line pb-3`}>
        <div className={`flex items-center gap-3 ${receipt ? "flex-col" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.store.logo} alt="" className={receipt ? "h-10 w-10 rounded-full" : "h-14 w-14 rounded-full"} />
          <div><b className="font-display text-2xl font-normal text-brand">{s.store.name}</b><p className="text-xs">{s.store.address} · {s.store.phone}</p></div>
        </div>
        <div className={receipt ? "" : "text-right"}><p className="font-bold">{receipt ? "RECEIPT" : "INVOICE"} {o.code}</p><p className="text-xs">{fmtDate(o.createdAt, true)}</p></div>
      </div>
      <div className="my-3 text-sm"><b>{o.customerName}</b> · {o.phone}{o.address && <><br />{o.address}</>}</div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left"><th className="py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{o.items.map((i) => <tr key={i.id} className="border-b border-line/50"><td className="py-1">{i.name}{i.variant ? ` (${i.variant})` : ""}{Array.isArray(i.modifiers) && i.modifiers.length > 0 && <span className="block text-xs text-muted">{(i.modifiers as any[]).map((m) => m.text ?? m.option).join(", ")}</span>}</td><td className="text-right">{i.qty}</td><td className="text-right">{tk(i.lineTotal)}</td></tr>)}</tbody>
      </table>
      <dl className="ml-auto mt-3 grid max-w-xs gap-0.5 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{tk(o.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Delivery</dt><dd>{tk(o.deliveryCharge)}</dd></div>
        {o.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{tk(o.discount)}</dd></div>}
        {o.total !== o.subtotal + o.deliveryCharge - o.discount && <div className="flex justify-between"><dt>Adjustments</dt><dd>{tk(o.total - (o.subtotal + o.deliveryCharge - o.discount))}</dd></div>}
        <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Total</dt><dd>{tk(o.total)}</dd></div>
        {o.payments.map((p) => <div key={p.id} className="flex justify-between text-xs"><dt>Paid · {PAYMENT_METHODS[p.method]} {fmtDate(p.createdAt)}</dt><dd>{tk(p.amount)}</dd></div>)}
        <div className="flex justify-between font-bold"><dt>Due</dt><dd>{tk(o.total - o.paidAmount)}</dd></div>
      </dl>
      <p className="mt-6 text-center font-script text-lg text-brand">{s.footer.quote}</p>
      <p className="text-center text-xs text-muted">Thank you for choosing Pipilika!</p>
    </div>
  );
}
