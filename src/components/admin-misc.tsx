"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";

export function ReviewToggle({ id, on }: { id: string; on: boolean }) {
  const router = useRouter();
  return <input type="checkbox" className="h-5 w-5 accent-brand" defaultChecked={on} aria-label="Visible" onChange={async (e) => { await api("/api/v1/admin/r/reviews", { method: "PATCH", body: { id, isApproved: e.target.checked } }); router.refresh(); }} />;
}

/** Editable price matrix: bases × weights. */
export function PriceMatrix({ bases, weights, prices }: { bases: { id: string; name: string }[]; weights: { grams: number; label: string }[]; prices: { baseId: string; grams: number; price: number }[] }) {
  const router = useRouter();
  const a = useAction();
  const [m, setM] = useState<Record<string, number | "">>(() => Object.fromEntries(prices.map((p) => [`${p.baseId}:${p.grams}`, p.price])));
  return (
    <div className="card overflow-x-auto p-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-body text-lg font-bold">Base price by weight (৳)</h2><button className="btn-primary btn-sm" disabled={a.busy} onClick={() => a.run(async () => { await api("/api/v1/admin/cake-prices", { body: { prices: Object.entries(m).filter(([, v]) => v !== "").map(([k, v]) => ({ baseId: k.split(":")[0], grams: Number(k.split(":")[1]), price: Number(v) })) } }); router.refresh(); }, "Prices saved")}>Save prices</button></div>
      <Alert error={a.error} msg={a.msg} />
      <table className="table">
        <thead><tr><th>Base \ Weight</th>{weights.map((w) => <th key={w.grams}>{w.label}</th>)}</tr></thead>
        <tbody>{bases.map((b) => <tr key={b.id}><td className="font-semibold">{b.name}</td>{weights.map((w) => { const k = `${b.id}:${w.grams}`; return <td key={k}><input type="number" className="input !w-24 !px-2 !py-1.5" value={m[k] ?? ""} onChange={(e) => setM({ ...m, [k]: e.target.value === "" ? "" : Number(e.target.value) })} aria-label={`${b.name} ${w.label}`} /></td>; })}</tr>)}</tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Empty cells: price is calculated per-gram from the nearest weights. Custom weights use the same interpolation. Past orders keep the price they were placed at.</p>
    </div>
  );
}

export function CustomerNotes({ id, notes }: { id: string; notes: string }) {
  const [v, setV] = useState(notes);
  const a = useAction();
  return (
    <div className="card grid gap-2 p-4">
      <h2 className="font-body text-lg font-bold">Notes (staff only)</h2>
      <textarea className="input" rows={3} value={v} onChange={(e) => setV(e.target.value)} placeholder="Allergies, preferences, birthdays…" />
      <Alert error={a.error} msg={a.msg} />
      <button className="btn-outline btn-sm justify-self-start" disabled={a.busy} onClick={() => a.run(() => api(`/api/v1/admin/customers/${id}`, { method: "PATCH", body: { notes: v } }), "Saved")}>Save notes</button>
    </div>
  );
}
