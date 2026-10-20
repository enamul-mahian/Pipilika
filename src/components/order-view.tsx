"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderViewData } from "@/lib/order-view";
import { tk, fmtDate, statusLabel, statusTone, weightLabel, PAYMENT_METHODS } from "@/lib/format";
import { api, useAction, Alert, fileToDataUrl } from "./ui";
import { track } from "./analytics";

const STANDARD_FLOW = ["PLACED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
const CUSTOM_FLOW = ["DESIGN_SUBMITTED", "QUOTE_SENT", "CUSTOMER_APPROVED", "ADVANCE_PAID", "BAKING", "DECORATING", "READY", "DELIVERED"];

export function OrderView({ order: o, token, methods, whatsapp, isNew }: { order: OrderViewData; token: string; methods: { key: string; instructions: string }[]; whatsapp: string; isNew?: boolean }) {
  const router = useRouter();
  const a = useAction();
  const flow = o.type === "CUSTOM" ? CUSTOM_FLOW : STANDARD_FLOW;
  const reached = new Set(o.events.map((e) => e.status));
  const curIdx = Math.max(flow.indexOf(o.status), ...flow.map((s, i) => (reached.has(s) ? i : -1)));
  const openQuote = o.quotes.find((q) => q.status === "SENT");
  const due = Math.max(0, o.total - o.paidAmount);
  const pendingPay = o.payments.some((p) => p.status === "VERIFICATION_REQUIRED");
  const canPay = due > 0 && !["CANCELLED", "REJECTED", "REFUNDED", "DESIGN_SUBMITTED", "UNDER_REVIEW", "QUOTE_SENT"].includes(o.status) && !(o.type === "CUSTOM" && !o.quotes.some((q) => q.status === "APPROVED"));
  const [pay, setPay] = useState({ method: methods[0]?.key ?? "BKASH", amount: openQuote?.advanceRequired || due, trxId: "", proof: "" });
  const respond = (approve: boolean) =>
    a.run(async () => {
      await api(`/api/v1/orders/by-token/${token}/quote`, { body: { approve } });
      if (approve) track("quote_accepted", { order: o.code });
      router.refresh();
    }, approve ? "Quote approved — please complete payment." : "Quote declined.");
  const submitPay = (e: React.FormEvent) => {
    e.preventDefault();
    a.run(async () => {
      track("payment_started", { order: o.code, method: pay.method });
      await api(`/api/v1/orders/by-token/${token}/payments`, { body: { ...pay, amount: Number(pay.amount) } });
      router.refresh();
    }, "Payment submitted. We'll verify it shortly.");
  };
  const waText = encodeURIComponent(`Hi Pipilika! About my order ${o.code}`);

  return (
    <div className="grid gap-6">
      {isNew && (
        <div className="rounded-2xl bg-green-50 p-5 text-green-900">
          <p className="font-display text-2xl">Thank you, {o.customerName.split(" ")[0]}! 🎉</p>
          <p>Your order <b>{o.code}</b> has been received. Save this page link to track it anytime.</p>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Order {o.type === "CUSTOM" ? "· Custom cake" : ""}</p>
          <h1 className="text-3xl">{o.code}</h1>
          <p className="text-sm text-muted">Placed {fmtDate(o.createdAt, true)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`chip ${statusTone(o.status)} !text-sm`}>{statusLabel(o.status)}</span>
          <span className={`chip ${statusTone(o.paymentStatus)} !text-sm`}>Payment: {statusLabel(o.paymentStatus)}</span>
        </div>
      </div>

      {!["CANCELLED", "REJECTED", "REFUNDED"].includes(o.status) && (
        <ol className="card flex overflow-x-auto p-4" aria-label="Progress">
          {flow.map((s, i) => (
            <li key={s} className="relative flex min-w-[88px] flex-1 flex-col items-center text-center text-[0.7rem]">
              {i > 0 && <span className={`absolute right-1/2 top-2.5 h-0.5 w-full ${i <= curIdx ? "bg-brand" : "bg-line"}`} />}
              <span className={`relative z-10 grid h-5 w-5 place-items-center rounded-full border-2 ${i <= curIdx ? "border-brand bg-brand" : "border-line bg-white"}`} />
              <span className={`mt-1.5 ${i <= curIdx ? "font-semibold text-ink" : "text-muted"}`}>{statusLabel(s)}</span>
            </li>
          ))}
        </ol>
      )}

      {openQuote && (
        <section className="card border-2 border-gold p-5">
          <h2 className="font-body text-lg font-bold">Your quote is ready</h2>
          <p className="mt-1 text-3xl font-bold text-brand">{tk(openQuote.amount)}</p>
          {openQuote.advanceRequired > 0 && <p className="text-sm">Advance to confirm: <b>{tk(openQuote.advanceRequired)}</b></p>}
          {openQuote.estimatedReadyAt && <p className="text-sm">Estimated ready: {fmtDate(openQuote.estimatedReadyAt, true)}</p>}
          {openQuote.note && <p className="mt-2 rounded-lg bg-cream p-3 text-sm">“{openQuote.note}”</p>}
          <div className="mt-4 flex gap-3">
            <button className="btn-primary" disabled={a.busy} onClick={() => respond(true)}>Approve quote</button>
            <button className="btn-outline" disabled={a.busy} onClick={() => window.confirm("Decline this quote?") && respond(false)}>Decline</button>
          </div>
        </section>
      )}
      <Alert error={a.error} msg={a.msg} />

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="card p-5">
          <h2 className="font-body text-lg font-bold">Items</h2>
          {o.design && (
            <div className="mt-3 grid gap-4 rounded-xl bg-cream p-3 sm:grid-cols-[180px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {o.design.hasPreview ? <img src={`/api/v1/designs/${o.design.id}/file/preview?t=${token}`} alt="Your cake design preview" className="w-full rounded-lg bg-white" /> : <div className="grid aspect-square place-items-center rounded-lg bg-white text-sm text-muted">No preview</div>}
              <div className="text-sm">
                <p className="font-semibold">{o.design.data?.summary ?? "Custom cake design"}</p>
                {o.estimatedWeightG && <p>Estimated weight: {weightLabel(o.estimatedWeightG)}{o.finalWeightG ? ` · Final: ${weightLabel(o.finalWeightG)}` : ""}</p>}
                <p>Estimated price: {tk(o.design.estimatedPrice)}</p>
                {o.design.shapeStatus !== "NONE" && <p>Custom shape: {statusLabel(o.design.shapeStatus)}</p>}
                <p className="mt-2 text-xs text-muted">Preview is an approximation. Final cake may vary slightly due to real-world baking, cream texture, color and decoration limitations.</p>
              </div>
            </div>
          )}
          <ul className="mt-3 divide-y divide-line">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.image && <img src={i.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{i.qty}× {i.name}{i.variant ? ` (${i.variant})` : ""}</p>
                  {i.modifiers.length > 0 && <p className="text-muted">{i.modifiers.map((m) => (m.text ? `${m.group}: ${m.text}` : m.qty ? `${m.option} ×${m.qty}` : m.option)).join(" · ")}</p>}
                  {i.note && <p className="text-muted">Note: {i.note}</p>}
                </div>
                <p className="font-semibold">{tk(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid gap-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{tk(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{tk(o.deliveryCharge)}</dd></div>
            {o.discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount {o.couponCode && `(${o.couponCode})`}</dt><dd>−{tk(o.discount)}</dd></div>}
            {o.adjustments.map((x, k) => <div key={k} className="flex justify-between text-muted"><dt>Adjustment: {x.reason}</dt><dd>{x.amount >= 0 ? "+" : "−"}{tk(Math.abs(x.amount))}</dd></div>)}
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{tk(o.total)}</dd></div>
            <div className="flex justify-between text-green-700"><dt>Paid</dt><dd>{tk(o.paidAmount)}</dd></div>
            <div className="flex justify-between font-bold text-brand"><dt>Due</dt><dd>{tk(due)}</dd></div>
          </dl>
        </section>
        <aside className="grid h-fit gap-4">
          <section className="card p-5 text-sm">
            <h2 className="font-body text-base font-bold">{o.fulfillment === "PICKUP" ? "Pickup" : "Delivery"}</h2>
            <p className="mt-1">{o.customerName} · {o.phone}</p>
            {o.address && <p className="text-muted">{o.address}{o.zoneName ? ` (${o.zoneName})` : ""}</p>}
            {o.deliveryDate && <p className="mt-1">Preferred: {fmtDate(o.deliveryDate, true)}</p>}
            {o.notes && <p className="mt-1 text-muted">Notes: {o.notes}</p>}
          </section>
          <section className="card p-5 text-sm">
            <h2 className="font-body text-base font-bold">Payments</h2>
            {o.payments.length === 0 && <p className="text-muted">No payments yet.</p>}
            <ul className="mt-1 grid gap-1">
              {o.payments.map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{PAYMENT_METHODS[p.method] ?? p.method} {p.trxId && <span className="text-muted">· {p.trxId}</span>}</span><span className="text-right">{tk(p.amount)}<br /><span className={`chip ${statusTone(p.status)}`}>{statusLabel(p.status)}</span></span></li>)}
            </ul>
          </section>
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_clicked", { order: o.code })} className="btn border border-green-600 text-green-700 hover:bg-green-50">Ask on WhatsApp</a>
        </aside>
      </div>

      {canPay && methods.length > 0 && (
        <form onSubmit={submitPay} className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-body text-lg font-bold sm:col-span-2">{pendingPay ? "Add another payment" : "Pay now"} <span className="text-sm font-normal text-muted">(due {tk(due)})</span></h2>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {methods.map((m) => <button type="button" key={m.key} onClick={() => setPay({ ...pay, method: m.key })} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${pay.method === m.key ? "border-brand bg-blush text-brand" : "border-line bg-white"}`}>{PAYMENT_METHODS[m.key]}</button>)}
          </div>
          <p className="rounded-lg bg-cream p-3 text-sm sm:col-span-2">{methods.find((m) => m.key === pay.method)?.instructions}</p>
          {pay.method === "BANGLA_QR" && /* eslint-disable-next-line @next/next/no-img-element */ <img src="/api/v1/payments/qr" alt="Bangla QR" className="h-32 w-32" />}
          <div><label className="label" htmlFor="amt">Amount</label><input id="amt" type="number" min={1} max={due} required className="input" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></div>
          <div><label className="label" htmlFor="trx2">Transaction / reference ID *</label><input id="trx2" required className="input" value={pay.trxId} onChange={(e) => setPay({ ...pay, trxId: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="proof">Payment screenshot (optional)</label>
            <input id="proof" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPay({ ...pay, proof: await fileToDataUrl(f, 1400) }); }} />
          </div>
          <button className="btn-primary sm:col-span-2 sm:w-fit" disabled={a.busy}>Submit payment</button>
        </form>
      )}
      <p className="text-center text-sm text-muted">Need help? <Link href="/contact" className="text-brand underline">Contact us</Link></p>
    </div>
  );
}
