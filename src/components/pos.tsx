"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { api, useAction, Alert } from "./ui";
import { ProductOptions } from "./product-options";
import { CakeDesigner, type DesignerConfig } from "./cake-designer";
import { tk } from "@/lib/format";

type P = { id: string; slug: string; name: string; image: string | null; basePrice: number; minQty: number; soldOut: boolean; stock: number | null; category: string; variants: { id: string; name: string; price: number }[]; modifiers: any[]; simple: boolean };
type Line = { key: string; productId: string; name: string; variantId: string | null; qty: number; unitPrice: number; options: any; summary: string; note?: string };
type Done = { id: string; code: string; total: number; paid: number; due: number; token: string; custom?: boolean };
const METHODS = [["CASH", "Cash"], ["BKASH", "bKash"], ["NAGAD", "Nagad"], ["BANGLA_QR", "Bangla QR"], ["CARD", "Card"], ["BANK", "Bank"]];

export function PosApp({ staffName, products, categories, config, recent }: { staffName: string; products: P[]; categories: { slug: string; name: string }[]; config: DesignerConfig; recent: { id: string; code: string; customerName: string; total: number; paidAmount: number; type: string; createdAt: string }[] }) {
  const [mode, setMode] = useState<"sale" | "custom">("sale");
  const [done, setDone] = useState<Done | null>(null);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 bg-cocoa px-4 py-2 text-white">
        <Link href="/admin" className="font-display text-2xl">Pipilika POS</Link>
        <div className="flex gap-1 rounded-full bg-white/10 p-1">
          <button className={`rounded-full px-4 py-1.5 text-sm ${mode === "sale" ? "bg-white font-bold text-brand" : ""}`} onClick={() => setMode("sale")}>Quick sale</button>
          <button className={`rounded-full px-4 py-1.5 text-sm ${mode === "custom" ? "bg-white font-bold text-brand" : ""}`} onClick={() => setMode("custom")}>Custom cake order</button>
        </div>
        <span className="ml-auto text-sm text-white/70">{staffName}</span>
        <Link href="/admin/orders?channel=POS" className="text-sm underline">POS orders</Link>
        <Link href="/admin" className="text-sm underline">Admin</Link>
      </header>
      {done && <DoneBar d={done} onClose={() => setDone(null)} />}
      {mode === "sale" ? <Sale products={products} categories={categories} onDone={setDone} recent={recent} /> : <Custom config={config} onDone={setDone} />}
    </div>
  );
}

function DoneBar({ d, onClose }: { d: Done; onClose: () => void }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/o/${d.token}` : `/o/${d.token}`;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
      <b>✓ {d.code} saved.</b> Total {tk(d.total)} · Paid {tk(d.paid)} {d.due > 0 && <b className="text-brand">· Due {tk(d.due)}</b>}
      <a className="btn-primary btn-sm" href={`/print/order/${d.id}`} target="_blank">Print receipt</a>
      <button className="btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(link)}>Copy customer link</button>
      <a className="btn-outline btn-sm" target="_blank" href={`https://wa.me/?text=${encodeURIComponent(`Your Pipilika order ${d.code}: ${link}`)}`}>Send on WhatsApp</a>
      <Link className="btn-ghost btn-sm" href={`/admin/orders/${d.id}`}>Open order</Link>
      <button className="ml-auto btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
    </div>
  );
}

function Sale({ products, categories, onDone, recent }: { products: P[]; categories: { slug: string; name: string }[]; onDone: (d: Done) => void; recent: { id: string; code: string; customerName: string; total: number; paidAmount: number; type: string; createdAt: string }[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [pick, setPick] = useState<P | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [cust, setCust] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [received, setReceived] = useState("");
  const [trxId, setTrxId] = useState("");
  const [showCart, setShowCart] = useState(false);
  const a = useAction();
  const list = useMemo(() => products.filter((p) => (!cat || p.category === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))), [products, q, cat]);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const paid = received === "" ? total : Math.min(Number(received) || 0, total);
  const change = method === "CASH" && received !== "" ? Math.max(0, (Number(received) || 0) - total) : 0;
  const addLine = (l: any) => {
    const key = `${l.productId}|${l.variantId}|${JSON.stringify(l.options)}|${l.note ?? ""}`;
    setLines((cur) => cur.some((x) => x.key === key) ? cur.map((x) => (x.key === key ? { ...x, qty: x.qty + l.qty } : x)) : [...cur, { key, productId: l.productId, name: l.name, variantId: l.variantId, qty: l.qty, unitPrice: l.unitPrice, options: l.options, summary: l.summary, note: l.note }]);
    setPick(null);
  };
  const tap = (p: P) => (p.simple ? addLine({ productId: p.id, name: p.name, variantId: null, qty: Math.max(1, p.minQty), unitPrice: p.basePrice, options: {}, summary: "" }) : setPick(p));
  const checkout = () => a.run(async () => {
    const r = await api<Done>("/api/v1/pos/sale", { body: { lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty, options: l.options, note: l.note })), customerName: cust.name, phone: cust.phone, discount: Number(discount) || 0, method, paid, trxId: trxId || undefined } });
    onDone(r); setLines([]); setDiscount(""); setReceived(""); setTrxId(""); setCust({ name: "", phone: "" }); setShowCart(false);
  });
  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="input !w-full sm:!w-64 !py-2" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          <div className="flex min-w-0 max-w-full gap-1 overflow-x-auto"><button className={`tab ${!cat ? "tab-on" : ""}`} onClick={() => setCat("")}>All</button>{categories.map((c) => <button key={c.slug} className={`tab whitespace-nowrap ${cat === c.slug ? "tab-on" : ""}`} onClick={() => setCat(c.slug)}>{c.name}</button>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <button key={p.id} disabled={p.soldOut} onClick={() => tap(p)} className="card overflow-hidden text-left transition hover:border-brand disabled:opacity-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image ? <img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-blush" />}
              <div className="p-2"><b className="block truncate text-sm">{p.name}</b><span className="text-sm text-brand">{tk(p.variants[0]?.price ?? p.basePrice)}</span>{p.stock != null && <span className="float-right text-xs text-muted">{p.soldOut ? "sold out" : `${p.stock} left`}</span>}</div>
            </button>
          ))}
        </div>
        {recent.length > 0 && <div className="mt-6 text-sm"><h2 className="mb-1 font-body font-bold">Recent POS orders</h2>{recent.map((o) => <Link key={o.id} href={`/admin/orders/${o.id}`} className="mr-3 inline-block text-brand">{o.code} · {tk(o.total)}{o.total > o.paidAmount ? " (due)" : ""}</Link>)}</div>}
      </section>
      <button className="fixed bottom-4 right-4 z-30 btn-primary shadow-lg lg:hidden" onClick={() => setShowCart(true)}>Cart ({lines.length}) · {tk(total)}</button>
      <aside className={`${showCart ? "fixed inset-0 z-40 overflow-y-auto" : "hidden"} border-l border-line bg-white p-4 lg:static lg:block`}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-body text-lg font-bold">Current sale</h2><button className="btn-ghost btn-sm lg:hidden" onClick={() => setShowCart(false)}>Close</button></div>
        {lines.length === 0 ? <p className="py-6 text-center text-sm text-muted">Tap a product to add it.</p> : (
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="flex items-start gap-2 py-2 text-sm">
                <div className="flex-1"><b>{l.name}</b>{l.summary && <p className="text-xs text-muted">{l.summary}</p>}<p className="text-xs">{tk(l.unitPrice)} each</p></div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost btn-sm !px-2" aria-label="Less" onClick={() => setLines(lines.flatMap((x) => (x.key === l.key ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])))}>−</button>
                  <span className="w-6 text-center">{l.qty}</span>
                  <button className="btn-ghost btn-sm !px-2" aria-label="More" onClick={() => setLines(lines.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                </div>
                <b className="w-16 text-right">{tk(l.unitPrice * l.qty)}</b>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid gap-2 border-t border-line pt-3 text-sm">
          <div className="grid grid-cols-2 gap-2"><input className="input !py-2" placeholder="Customer name" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /><input className="input !py-2" placeholder="Phone (optional)" inputMode="tel" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
          <div className="flex justify-between"><span>Subtotal</span><b>{tk(subtotal)}</b></div>
          <div className="flex items-center justify-between gap-2"><span>Discount (৳)</span><input className="input !w-28 !py-1.5 text-right" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div className="flex justify-between text-lg"><span>Total</span><b className="text-brand">{tk(total)}</b></div>
          <div className="flex flex-wrap gap-1">{METHODS.map(([v, l]) => <button key={v} className={`tab ${method === v ? "tab-on" : ""}`} onClick={() => setMethod(v)}>{l}</button>)}</div>
          {method !== "CASH" && <input className="input !py-2" placeholder="Transaction ID / reference" value={trxId} onChange={(e) => setTrxId(e.target.value)} />}
          <div className="flex items-center justify-between gap-2"><span>{method === "CASH" ? "Cash received" : "Amount paid"}</span><input className="input !w-28 !py-1.5 text-right" type="number" min={0} placeholder={String(total)} value={received} onChange={(e) => setReceived(e.target.value)} /></div>
          {change > 0 && <div className="flex justify-between text-green-700"><span>Change to return</span><b>{tk(change)}</b></div>}
          {paid < total && <div className="flex justify-between text-brand"><span>Due (kept on order)</span><b>{tk(total - paid)}</b></div>}
          <Alert error={a.error} />
          <button className="btn-primary w-full" disabled={!lines.length || a.busy} onClick={checkout}>{a.busy ? "Saving…" : `Complete sale · ${tk(total)}`}</button>
          {lines.length > 0 && <button className="btn-ghost btn-sm" onClick={() => window.confirm("Clear this sale?") && setLines([])}>Clear</button>}
        </div>
      </aside>
      {pick && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setPick(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between"><h2 className="font-body text-xl font-bold">{pick.name}</h2><button className="btn-ghost btn-sm" onClick={() => setPick(null)} aria-label="Close">✕</button></div>
            <ProductOptions product={pick} onAdd={addLine} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function Custom({ config, onDone }: { config: DesignerConfig; onDone: (d: Done) => void }) {
  const [c, setC] = useState({ name: "", phone: "", fulfillment: "PICKUP", address: "", deliveryCharge: String(config.zones[0]?.charge ?? 0), deliveryDate: "" });
  const [price, setPrice] = useState("");
  const [advance, setAdvance] = useState("");
  const [method, setMethod] = useState("CASH");
  const [trxId, setTrxId] = useState("");
  const [k, setK] = useState(0);
  const submit = async (payload: any) => {
    if (!c.name.trim() || !c.phone.trim()) throw new Error("Enter the customer name and phone at the top first");
    const r = await api<any>("/api/v1/pos/custom", { body: { ...payload, customer: { ...c, deliveryCharge: Number(c.deliveryCharge) || 0 }, priceOverride: price ? Number(price) : null, advance: Number(advance) || 0, method, trxId: trxId || undefined } });
    onDone({ id: r.id, code: r.code, total: r.total, paid: r.advance, due: r.due, token: r.token, custom: true });
    setC({ ...c, name: "", phone: "", address: "" }); setPrice(""); setAdvance(""); setTrxId(""); setK(k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="grid gap-4 p-4">
      <div className="card grid gap-3 p-4 md:grid-cols-4">
        <div><label className="label">Customer name *</label><input className="input !py-2" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
        <div><label className="label">Phone *</label><input className="input !py-2" inputMode="tel" placeholder="01XXXXXXXXX" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div>
        <div><label className="label">Needed by</label><input type="datetime-local" className="input !py-2" value={c.deliveryDate} onChange={(e) => setC({ ...c, deliveryDate: e.target.value })} /></div>
        <div><label className="label">Pickup / delivery</label><select className="input !py-2" value={c.fulfillment} onChange={(e) => setC({ ...c, fulfillment: e.target.value })}><option value="PICKUP">Pickup</option><option value="DELIVERY">Delivery</option></select></div>
        {c.fulfillment === "DELIVERY" && <><div className="md:col-span-3"><label className="label">Address *</label><input className="input !py-2" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></div><div><label className="label">Delivery charge</label><input type="number" className="input !py-2" value={c.deliveryCharge} onChange={(e) => setC({ ...c, deliveryCharge: e.target.value })} /></div></>}
        <div><label className="label">Your price (blank = calculator)</label><input type="number" className="input !py-2" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Auto" /></div>
        <div><label className="label">Advance received</label><input type="number" className="input !py-2" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0" /></div>
        <div><label className="label">Advance via</label><select className="input !py-2" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div><label className="label">Trx ID</label><input className="input !py-2" value={trxId} onChange={(e) => setTrxId(e.target.value)} /></div>
        <p className="text-xs text-muted md:col-span-4">Design the cake below. On the last step press “Create custom order”. With no advance the customer gets a quote link to approve and pay online.</p>
      </div>
      <CakeDesigner key={k} config={config} mode="pos" onPosSubmit={submit} />
    </div>
  );
}
