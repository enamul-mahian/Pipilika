"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";
import { statusLabel, tk, PAYMENT_METHODS } from "@/lib/format";
import { can } from "@/lib/permissions";

const ADJ_REASONS = ["Weight increased", "Size increased", "Premium design", "Edible print", "Extra decoration", "Premium board", "Urgent delivery", "Delivery charge", "Discount", "Other"];

type O = { id: string; type: string; status: string; total: number; due: number; paid: number; notes: string; hasDesign: boolean; shapeStatus: string; estimatedWeightG: number | null; quotedPrice: number; shareToken: string | null; hasPreview: boolean; deliveryCharge: number };

export function OrderActions({ order: o, statuses, perms }: { order: O; statuses: string[]; perms: string[] }) {
  const router = useRouter();
  const a = useAction();
  const [tab, setTab] = useState(o.type === "CUSTOM" && ["DESIGN_SUBMITTED", "UNDER_REVIEW"].includes(o.status) ? "quote" : o.due > 0 ? "pay" : "status");
  const [f, setF] = useState<Record<string, any>>({ status: o.status, note: "", amount: o.quotedPrice, advanceRequired: Math.round(o.quotedPrice / 2), estimatedReadyAt: "", reason: ADJ_REASONS[0], adjAmount: 0, finalWeightG: o.estimatedWeightG ?? "", finalPrice: o.quotedPrice, payAmount: o.due, method: "CASH", trxId: "", refundAmount: 0, refundMethod: "CASH", refundReason: "", shapeStatus: o.shapeStatus === "NONE" ? "APPROVED" : o.shapeStatus, shapeSurcharge: 0, minWeightG: o.estimatedWeightG ?? "", productionNotes: "", notes: o.notes, galleryTitle: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const act = (body: Record<string, unknown>, msg = "Saved") => a.run(async () => { const r = await api(`/api/v1/admin/orders/${o.id}`, { body }); router.refresh(); return r; }, msg);
  const manage = can(perms, "orders.manage"), pay = can(perms, "payments.verify");
  const tabs = [
    manage && ["status", "Status"], manage && o.type === "CUSTOM" && ["quote", "Quote"], manage && ["final", "Final price"], pay && ["pay", "Collect"], pay && o.paid > 0 && ["refund", "Refund"],
    manage && o.hasDesign && ["shape", "Shape"], ["more", "More"],
  ].filter(Boolean) as [string, string][];
  return (
    <section className="card p-5">
      <h2 className="font-body text-base font-bold">Actions</h2>
      <div className="mt-2 flex flex-wrap gap-1">{tabs.map(([k, l]) => <button key={k} className={`tab ${tab === k ? "tab-on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="mt-3 grid gap-3 text-sm">
        {tab === "status" && (
          <>
            <select className="input" value={f.status} onChange={set("status")} aria-label="Status">{statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
            <input className="input" placeholder="Note (optional)" value={f.note} onChange={set("note")} />
            <button className="btn-primary" disabled={a.busy} onClick={() => (f.status !== "CANCELLED" || window.confirm("Cancel this order? Stock will be returned.")) && act({ action: "status", status: f.status, note: f.note || undefined }, "Status updated")}>Update status</button>
            {o.type === "CUSTOM" && o.status !== "REJECTED" && <button className="btn-outline" disabled={a.busy} onClick={() => { const r = window.prompt("Reason for rejecting this design?"); if (r) act({ action: "reject", reason: r }, "Rejected"); }}>Reject design…</button>}
          </>
        )}
        {tab === "quote" && (
          <>
            <label><span className="label">Quote amount (cake, excl. delivery)</span><input type="number" className="input" value={f.amount} onChange={set("amount")} /></label>
            <label><span className="label">Advance required</span><input type="number" className="input" value={f.advanceRequired} onChange={set("advanceRequired")} /></label>
            <label><span className="label">Estimated ready</span><input type="datetime-local" className="input" value={f.estimatedReadyAt} onChange={set("estimatedReadyAt")} /></label>
            <textarea className="input" rows={2} placeholder="Note to customer (feasibility, changes…)" value={f.note} onChange={set("note")} />
            <button className="btn-primary" disabled={a.busy} onClick={() => act({ action: "quote", amount: Number(f.amount), advanceRequired: Number(f.advanceRequired), note: f.note || undefined, estimatedReadyAt: f.estimatedReadyAt || undefined }, "Quote sent to customer")}>Send quote</button>
          </>
        )}
        {tab === "final" && (
          <>
            <p className="text-muted">Set the final weight & price after baking. Delivery ({tk(o.deliveryCharge)}) is added automatically.</p>
            <label><span className="label">Final weight (g)</span><input type="number" className="input" value={f.finalWeightG} onChange={set("finalWeightG")} /></label>
            <label><span className="label">Final cake price</span><input type="number" className="input" value={f.finalPrice} onChange={set("finalPrice")} /></label>
            <select className="input" value={f.reason} onChange={set("reason")} aria-label="Reason">{ADJ_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
            <button className="btn-primary" disabled={a.busy} onClick={() => act({ action: "final", finalWeightG: Number(f.finalWeightG) || undefined, finalPrice: Number(f.finalPrice), reason: f.reason }, "Final price set")}>Set final price</button>
            <hr className="border-line" />
            <p className="font-semibold">Or quick adjustment (+/−)</p>
            <div className="flex gap-2"><input type="number" className="input" value={f.adjAmount} onChange={set("adjAmount")} aria-label="Adjustment amount" /><button className="btn-outline shrink-0" disabled={a.busy || !Number(f.adjAmount)} onClick={() => act({ action: "adjust", amount: Number(f.adjAmount), reason: f.reason }, "Adjusted")}>Apply</button></div>
          </>
        )}
        {tab === "pay" && (
          <>
            <p>Due: <b className="text-brand">{tk(o.due)}</b></p>
            <input type="number" className="input" value={f.payAmount} onChange={set("payAmount")} aria-label="Amount" />
            <select className="input" value={f.method} onChange={set("method")} aria-label="Method">{["CASH", "BKASH", "NAGAD", "BANGLA_QR", "BANK", "CARD"].map((m) => <option key={m} value={m}>{PAYMENT_METHODS[m]}</option>)}</select>
            {f.method !== "CASH" && <input className="input" placeholder="Transaction ID" value={f.trxId} onChange={set("trxId")} />}
            <button className="btn-primary" disabled={a.busy || o.due <= 0} onClick={() => act({ action: "collect", amount: Number(f.payAmount), method: f.method, trxId: f.trxId || undefined }, "Payment recorded")}>Record payment</button>
          </>
        )}
        {tab === "refund" && (
          <>
            <input type="number" className="input" placeholder="Amount" value={f.refundAmount} onChange={set("refundAmount")} aria-label="Refund amount" />
            <select className="input" value={f.refundMethod} onChange={set("refundMethod")} aria-label="Refund method">{["CASH", "BKASH", "NAGAD", "BANK"].map((m) => <option key={m} value={m}>{PAYMENT_METHODS[m]}</option>)}</select>
            <input className="input" placeholder="Reason" value={f.refundReason} onChange={set("refundReason")} />
            <button className="btn-outline border-red-300 text-red-700" disabled={a.busy} onClick={() => window.confirm(`Refund ${tk(Number(f.refundAmount))}?`) && act({ action: "refund", amount: Number(f.refundAmount), method: f.refundMethod, reason: f.refundReason }, "Refunded")}>Refund</button>
          </>
        )}
        {tab === "shape" && (
          <>
            <select className="input" value={f.shapeStatus} onChange={set("shapeStatus")} aria-label="Shape status">{["SUBMITTED", "APPROVED", "NEEDS_CHANGES", "REJECTED"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
            <label><span className="label">Shape surcharge</span><input type="number" className="input" value={f.shapeSurcharge} onChange={set("shapeSurcharge")} /></label>
            <label><span className="label">Minimum weight (g)</span><input type="number" className="input" value={f.minWeightG} onChange={set("minWeightG")} /></label>
            <textarea className="input" rows={2} placeholder="Production notes / requested changes" value={f.productionNotes} onChange={set("productionNotes")} />
            <button className="btn-primary" disabled={a.busy} onClick={() => act({ action: "shape", shapeStatus: f.shapeStatus, shapeSurcharge: Number(f.shapeSurcharge) || 0, minWeightG: Number(f.minWeightG) || undefined, productionNotes: f.productionNotes || undefined })}>Save shape review</button>
          </>
        )}
        {tab === "more" && (
          <>
            <label><span className="label">Internal notes</span><textarea className="input" rows={3} value={f.notes} onChange={set("notes")} /></label>
            {manage && <button className="btn-outline" disabled={a.busy} onClick={() => act({ action: "notes", notes: f.notes })}>Save notes</button>}
            <button className="btn-outline" onClick={async () => { const r: any = await act({ action: "share" }, "Link ready"); if (r?.url) { const url = location.origin + r.url; await navigator.clipboard?.writeText(url).catch(() => {}); window.prompt("Secure customer link (copied):", url); } }}>Copy secure customer link</button>
            {o.hasPreview && can(perms, "products.manage") && (
              <div className="flex gap-2"><input className="input" placeholder="Gallery title" value={f.galleryTitle} onChange={set("galleryTitle")} /><button className="btn-outline shrink-0" disabled={!f.galleryTitle || a.busy} onClick={() => act({ action: "gallery", title: f.galleryTitle }, "Published to gallery with “Order similar”")}>Publish</button></div>
            )}
          </>
        )}
        <Alert error={a.error} msg={a.msg} />
      </div>
    </section>
  );
}
