"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";
import { Input, type Field } from "./crud";

const init = (fields: Field[]) => Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : f.type === "select" ? f.options?.[0]?.value ?? "" : ""]));

/** Small form that POSTs its values (plus `extra`) to an endpoint, then refreshes the page. */
export function ApiForm({ endpoint, fields, extra, submit = "Save", title, method = "POST", className = "" }: { endpoint: string; fields: Field[]; extra?: Record<string, unknown>; submit?: string; title?: string; method?: string; className?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, any>>(() => init(fields));
  const a = useAction();
  return (
    <form className={`card grid gap-3 p-4 ${className}`} onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api(endpoint, { method, body: { ...form, ...extra } }); setForm(init(fields)); router.refresh(); }, "Saved"); }}>
      {title && <h2 className="font-body text-lg font-bold">{title}</h2>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>{f.type !== "checkbox" && <label className="label" htmlFor={"f_" + f.key}>{f.label}</label>}<Input f={f} value={form[f.key]} set={(v) => setForm({ ...form, [f.key]: v })} /></div>)}
      </div>
      <Alert error={a.error} msg={a.msg} />
      <div><button className="btn-primary btn-sm" disabled={a.busy}>{a.busy ? "Saving…" : submit}</button></div>
    </form>
  );
}

export function DeleteButton({ endpoint, label = "Delete", confirm = "Delete this? This cannot be undone." }: { endpoint: string; label?: string; confirm?: string }) {
  const router = useRouter();
  const a = useAction();
  return <button className="btn-ghost btn-sm text-red-700" disabled={a.busy} title={a.error ?? undefined} onClick={() => window.confirm(confirm) && a.run(async () => { await api(endpoint, { method: "DELETE" }); router.refresh(); })}>{a.error ? "Failed" : label}</button>;
}

const METHODS = [["CASH", "Cash"], ["BKASH", "bKash"], ["NAGAD", "Nagad"], ["BANK", "Bank"]];

export function PurchaseForm({ suppliers, items }: { suppliers: { id: string; name: string }[]; items: { id: string; name: string; unit: string; costPerUnit: number }[] }) {
  const router = useRouter();
  const a = useAction();
  const blank = () => ({ itemId: items[0]?.id ?? "", qty: "", unitCost: String(items[0]?.costPerUnit ?? "") });
  const [f, setF] = useState({ supplierId: suppliers[0]?.id ?? "", invoiceNo: "", method: "CASH", paid: "", note: "" });
  const [lines, setLines] = useState([blank()]);
  const total = lines.reduce((s, l) => s + Math.round(Number(l.qty || 0) * Number(l.unitCost || 0)), 0);
  const setLine = (i: number, p: Partial<ReturnType<typeof blank>>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  if (!suppliers.length || !items.length) return <p className="card p-4 text-sm text-muted">Add a supplier and an inventory item first.</p>;
  return (
    <form className="card grid gap-3 p-4" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/admin/purchases", { body: { ...f, paid: Number(f.paid || 0), items: lines.filter((l) => Number(l.qty) > 0) } }); setLines([blank()]); setF({ ...f, invoiceNo: "", paid: "", note: "" }); router.refresh(); }, "Purchase saved, stock and ledger updated"); }}>
      <h2 className="font-body text-lg font-bold">New purchase</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Supplier</label><select className="input !py-2" value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="label">Invoice no.</label><input className="input !py-2" value={f.invoiceNo} onChange={(e) => setF({ ...f, invoiceNo: e.target.value })} /></div>
        <div><label className="label">Note</label><input className="input !py-2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      </div>
      <div className="grid gap-2">
        {lines.map((l, i) => {
          const it = items.find((x) => x.id === l.itemId);
          return (
            <div key={i} className="grid grid-cols-[1fr_80px_90px_auto] items-end gap-2">
              <div><label className="label">Item</label><select className="input !py-2" value={l.itemId} onChange={(e) => setLine(i, { itemId: e.target.value, unitCost: String(items.find((x) => x.id === e.target.value)?.costPerUnit ?? "") })}>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
              <div><label className="label">Qty ({it?.unit})</label><input className="input !py-2" type="number" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></div>
              <div><label className="label">Unit cost</label><input className="input !py-2" type="number" step="any" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></div>
              <button type="button" className="btn-ghost btn-sm" aria-label="Remove line" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)}>✕</button>
            </div>
          );
        })}
        <button type="button" className="btn-outline btn-sm justify-self-start" onClick={() => setLines([...lines, blank()])}>+ Add line</button>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <p className="text-lg">Total: <b>৳{total.toLocaleString("en-IN")}</b></p>
        <div><label className="label">Paid now</label><input className="input !py-2" type="number" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} placeholder="0 = all due" /></div>
        <div><label className="label">Paid via</label><select className="input !py-2" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      </div>
      <Alert error={a.error} msg={a.msg} />
      <div><button className="btn-primary btn-sm" disabled={a.busy}>Save purchase</button></div>
    </form>
  );
}

export function JournalForm({ accounts }: { accounts: { id: string; code: string; name: string }[] }) {
  const router = useRouter();
  const a = useAction();
  const blank = () => ({ accountId: accounts[0]?.id ?? "", debit: "", credit: "" });
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([blank(), blank()]);
  const d = lines.reduce((s, l) => s + Number(l.debit || 0), 0), c = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const setLine = (i: number, p: Partial<ReturnType<typeof blank>>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <form className="card grid gap-3 p-4" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/admin/journal", { body: { narration, lines } }); setLines([blank(), blank()]); setNarration(""); router.refresh(); }, "Voucher posted"); }}>
      <h2 className="font-body text-lg font-bold">Manual journal voucher</h2>
      <input className="input !py-2" placeholder="Narration (e.g. Owner added capital)" value={narration} onChange={(e) => setNarration(e.target.value)} />
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_90px_90px] gap-2">
          <select className="input !py-2" value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
          <input className="input !py-2" type="number" placeholder="Debit" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: "" })} />
          <input className="input !py-2" type="number" placeholder="Credit" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: "" })} />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 text-sm"><button type="button" className="btn-outline btn-sm" onClick={() => setLines([...lines, blank()])}>+ Line</button><span className={d === c && d > 0 ? "text-green-700" : "text-red-700"}>Debit ৳{d} · Credit ৳{c} {d === c && d > 0 ? "✓ balanced" : "(must balance)"}</span></div>
      <Alert error={a.error} msg={a.msg} />
      <div><button className="btn-primary btn-sm" disabled={a.busy || d !== c || d <= 0}>Post voucher</button></div>
    </form>
  );
}
