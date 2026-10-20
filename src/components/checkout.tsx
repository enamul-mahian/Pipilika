"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "./cart";
import { api, useAction, Alert } from "./ui";
import { tk, PAYMENT_METHODS } from "@/lib/format";
import { track } from "./analytics";

type Quote = { subtotal: number; deliveryCharge: number; discount: number; total: number; couponMessage: string | null; couponApplied: boolean };

export function Checkout({ zones, methods, user }: { zones: { id: string; name: string; charge: number }[]; methods: { key: string; instructions: string }[]; user: { name: string; phone: string; email: string; address: string } | null }) {
  const { lines, ready, clear } = useCart();
  const router = useRouter();
  const [f, setF] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "", fulfillment: "DELIVERY", zoneId: zones[0]?.id ?? "", address: user?.address ?? "", deliveryDate: "", notes: "", method: methods[0]?.key ?? "COD", trxId: "" });
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  const a = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const payload = useMemo(() => lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty, options: l.options, note: l.note })), [lines]);

  useEffect(() => { if (ready && lines.length) track("begin_checkout", { value: lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), currency: "BDT" }); }, [ready]); // eslint-disable-line

  useEffect(() => {
    if (!ready || !lines.length) return;
    const t = setTimeout(() => {
      api<Quote>("/api/v1/cart/quote", { body: { lines: payload, couponCode: applied || null, zoneId: f.zoneId, fulfillment: f.fulfillment, phone: f.phone } })
        .then((q) => { setQuote(q); setQErr(null); })
        .catch((e) => setQErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [payload, applied, f.zoneId, f.fulfillment, f.phone, ready, lines.length]);

  if (!ready) return <p className="mt-6">Loading…</p>;
  if (!lines.length) return <div className="card mt-6 p-8 text-center"><p>Your cart is empty.</p><Link href="/shop" className="btn-primary mt-3">Shop now</Link></div>;
  const method = methods.find((m) => m.key === f.method);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    a.run(async () => {
      const r = await api<{ token: string; code: string; total: number }>("/api/v1/orders", { body: { ...f, couponCode: applied || null, lines: payload, source: sessionStorage.getItem("pp_src") } });
      track("purchase", { transaction_id: r.code, value: r.total, currency: "BDT" });
      clear();
      router.push(`/o/${r.token}?new=1`);
    });
  };

  return (
    <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-body text-lg font-bold sm:col-span-2">Your details</h2>
          <div><label className="label" htmlFor="name">Full name *</label><input id="name" required className="input" value={f.name} onChange={set("name")} autoComplete="name" /></div>
          <div><label className="label" htmlFor="phone">Mobile number *</label><input id="phone" required className="input" value={f.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="email">Email (optional)</label><input id="email" type="email" className="input" value={f.email} onChange={set("email")} autoComplete="email" /></div>
          {!user && <p className="text-sm text-muted sm:col-span-2">Have an account? <Link href="/login?next=/checkout" className="font-semibold text-brand">Log in</Link> to track orders easily.</p>}
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-body text-lg font-bold sm:col-span-2">Delivery</h2>
          <div className="flex gap-2 sm:col-span-2">
            {["DELIVERY", "PICKUP"].map((k) => (
              <button type="button" key={k} onClick={() => setF({ ...f, fulfillment: k })} aria-pressed={f.fulfillment === k} className={`flex-1 rounded-lg border px-3 py-2.5 font-semibold ${f.fulfillment === k ? "border-brand bg-blush text-brand" : "border-line bg-white"}`}>{k === "DELIVERY" ? "Home delivery" : "Pickup from shop"}</button>
            ))}
          </div>
          {f.fulfillment === "DELIVERY" && (
            <>
              <div><label className="label" htmlFor="zone">Area *</label><select id="zone" className="input" value={f.zoneId} onChange={set("zoneId")}>{zones.map((z) => <option key={z.id} value={z.id}>{z.name} — {tk(z.charge)}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="address">Full address *</label><textarea id="address" required className="input" rows={2} value={f.address} onChange={set("address")} autoComplete="street-address" /></div>
            </>
          )}
          <div><label className="label" htmlFor="date">Preferred date & time</label><input id="date" type="datetime-local" className="input" value={f.deliveryDate} onChange={set("deliveryDate")} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="notes">Order notes</label><textarea id="notes" className="input" rows={2} value={f.notes} onChange={set("notes")} placeholder="Message on cake, gate code, etc." /></div>
        </section>
        <section className="card grid gap-3 p-5">
          <h2 className="font-body text-lg font-bold">Payment</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {methods.map((m) => (
              <label key={m.key} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${f.method === m.key ? "border-brand bg-blush" : "border-line bg-white"}`}>
                <input type="radio" name="method" value={m.key} checked={f.method === m.key} onChange={set("method")} className="accent-brand" />
                <span className="font-semibold">{PAYMENT_METHODS[m.key] ?? m.key}</span>
              </label>
            ))}
          </div>
          {method && <p className="rounded-lg bg-cream p-3 text-sm">{method.instructions}</p>}
          {f.method === "BANGLA_QR" && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-line p-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/v1/payments/qr" alt="Bangla QR code" className="h-28 w-28" />
              <span>Scan with any bank or MFS app. Amount: <b>{tk(quote?.total)}</b></span>
            </div>
          )}
          {f.method !== "COD" && (
            <div><label className="label" htmlFor="trx">Transaction / reference ID</label><input id="trx" className="input" value={f.trxId} onChange={set("trxId")} placeholder="You can also add this later from your order page" /></div>
          )}
        </section>
      </div>
      <aside className="card h-fit p-5 lg:sticky lg:top-24">
        <h2 className="font-body text-lg font-bold">Order summary</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {lines.map((l) => <li key={l.key} className="flex justify-between gap-2"><span>{l.qty}× {l.name}{l.variantName ? ` (${l.variantName})` : ""}</span><span>{tk(l.unitPrice * l.qty)}</span></li>)}
        </ul>
        <div className="mt-4 flex gap-2">
          <input className="input uppercase" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="Coupon code" />
          <button type="button" className="btn-outline shrink-0" onClick={() => setApplied(coupon.trim().toUpperCase())}>Apply</button>
        </div>
        {quote?.couponMessage && applied && <p className={`mt-1 text-sm ${quote.couponApplied ? "text-green-700" : "text-red-700"}`}>{quote.couponMessage} {quote.couponApplied && <button type="button" className="underline" onClick={() => { setApplied(""); setCoupon(""); }}>remove</button>}</p>}
        <dl className="mt-4 grid gap-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{tk(quote?.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{tk(quote?.deliveryCharge)}</dd></div>
          {!!quote?.discount && <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−{tk(quote.discount)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd className="text-brand">{tk(quote?.total)}</dd></div>
        </dl>
        {qErr && <p className="mt-2 text-sm text-red-700">{qErr}</p>}
        <div className="mt-3"><Alert error={a.error} /></div>
        <button className="btn-primary mt-4 w-full" disabled={a.busy || !!qErr}>{a.busy ? "Placing order…" : "Place order"}</button>
        <p className="mt-2 text-center text-xs text-muted">By ordering you agree to our <Link href="/policies" className="underline">policies</Link>.</p>
      </aside>
    </form>
  );
}
