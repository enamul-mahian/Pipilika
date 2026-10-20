import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel, statusTone, weightLabel, PAYMENT_METHODS, ORDER_STATUSES, CUSTOM_STATUSES } from "@/lib/format";
import { OrderActions } from "@/components/admin-order-actions";
import { PaymentVerify } from "@/components/admin-payment-verify";
import { getStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { createdAt: "asc" } }, quotes: { orderBy: { createdAt: "desc" } }, adjustments: { orderBy: { createdAt: "asc" } }, refunds: true, design: true, user: true, conversations: { select: { id: true } } },
  });
  if (!o) notFound();
  const s = (await getStaff())!;
  const d = o.design;
  const dd = (d?.data ?? {}) as any;
  const staffIds = [...new Set([...o.events.map((e) => e.byId), ...o.adjustments.map((a) => a.byId)].filter(Boolean))] as string[];
  const staff = await db.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } });
  const who = (uid?: string | null) => staff.find((x) => x.id === uid)?.name ?? (uid ? "Staff" : "Customer/System");
  const due = o.total - o.paidAmount;
  const file = (k: string, dl = false) => `/api/v1/designs/${d!.id}/file/${k}${dl ? "?download=1" : ""}`;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={o.type === "CUSTOM" ? "/admin/orders?type=CUSTOM" : "/admin/orders"} className="text-sm text-muted">← Orders</Link>
          <h1 className="text-3xl">{o.code} {o.type === "CUSTOM" && <span className="chip bg-gold/30 align-middle text-ink">Custom cake</span>}</h1>
          <p className="text-sm text-muted">{fmtDate(o.createdAt, true)} · {o.channel} · source: {o.source ?? "direct"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`chip ${statusTone(o.status)} !text-sm`}>{statusLabel(o.status)}</span>
          <span className={`chip ${statusTone(o.paymentStatus)} !text-sm`}>{statusLabel(o.paymentStatus)}</span>
          <Link href={`/print/order/${o.id}`} target="_blank" className="btn-outline btn-sm">Print invoice</Link>
          <Link href={`/print/order/${o.id}?receipt=1`} target="_blank" className="btn-outline btn-sm">Receipt</Link>
          {o.shareToken && <Link href={`/o/${o.shareToken}`} target="_blank" className="btn-outline btn-sm">Customer link ↗</Link>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          {d && (
            <section className="card p-5">
              <h2 className="font-body text-lg font-bold">Design</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-[260px_1fr]">
                <div className="grid gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {d.previewKey ? <img src={file("preview")} alt="Full cake preview" className="w-full rounded-xl border border-line bg-cream" /> : <div className="grid aspect-square place-items-center rounded-xl bg-cream text-sm text-muted">No preview (created by staff/seed)</div>}
                  <p className="text-center text-xs text-muted">Full cake preview</p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{d.title}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    <dt className="text-muted">Estimated weight</dt><dd>{weightLabel(o.estimatedWeightG)}</dd>
                    <dt className="text-muted">Final weight</dt><dd>{weightLabel(o.finalWeightG)}</dd>
                    <dt className="text-muted">Estimated price</dt><dd>{tk(d.estimatedPrice)}</dd>
                    <dt className="text-muted">Quoted</dt><dd>{o.quotedPrice ? tk(o.quotedPrice) : "—"}</dd>
                    <dt className="text-muted">Final price</dt><dd>{o.finalPrice ? tk(o.finalPrice) : "—"}</dd>
                    <dt className="text-muted">Shape</dt><dd>{d.shapeKind ?? "preset"}{dd.shape?.text ? ` “${dd.shape.text}”` : dd.shape?.preset ? ` (${dd.shape.preset})` : ""} · {dd.shape?.widthIn}″×{dd.shape?.heightIn}″</dd>
                    <dt className="text-muted">Shape approval</dt><dd>{statusLabel(d.shapeStatus)}{d.shapeSurcharge ? ` · +${tk(d.shapeSurcharge)}` : ""}</dd>
                    <dt className="text-muted">Print</dt><dd>{d.printType ?? "NONE"} {d.printSizeIn ? `· ${d.printSizeIn}″` : ""}</dd>
                    <dt className="text-muted">Cream / board</dt><dd><span className="inline-block h-3 w-3 rounded-full border align-middle" style={{ background: dd.cream }} /> {dd.cream} · {dd.board?.shape} {dd.board?.sizeIn}″</dd>
                    <dt className="text-muted">Text</dt><dd>{(dd.texts ?? []).map((t: any) => t.text).join(" / ") || "—"}</dd>
                    <dt className="text-muted">Photo later?</dt><dd>{dd.sendPhotoLater ? "Yes — via WhatsApp/chat" : "No"}</dd>
                  </dl>
                  {dd.note && <p className="mt-2 rounded-lg bg-cream p-2">Customer note: {dd.note}</p>}
                  {d.productionNotes && <p className="mt-2 rounded-lg bg-blush p-2">Production: {d.productionNotes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.originalKey && <a href={file("original", true)} className="btn-outline btn-sm">Original upload</a>}
                    {d.bgRemovedKey && <a href={file("bgremoved", true)} className="btn-outline btn-sm">Background removed</a>}
                    {d.printKey && <a href={file("print", true)} className="btn-outline btn-sm">Topper PNG (transparent)</a>}
                    {d.printKey && <a href={file("pdf", true)} className="btn-outline btn-sm">Print-ready PDF</a>}
                    {d.outlineSvg && <a href={file("outline", true)} className="btn-outline btn-sm">Outline SVG</a>}
                    {d.previewKey && <a href={file("preview", true)} className="btn-outline btn-sm">Preview PNG</a>}
                  </div>
                  {d.printKey && (
                    <div className="checker mt-3 w-40 rounded-lg p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file("print")} alt="Print asset" className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-body text-lg font-bold">Items</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image && <img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div className="flex-1"><b>{i.qty}× {i.name}{i.variant ? ` (${i.variant})` : ""}</b>
                    {Array.isArray(i.modifiers) && i.modifiers.length > 0 && <p className="text-muted">{(i.modifiers as any[]).map((m) => (m.text ? `${m.group}: ${m.text}` : `${m.group}: ${m.option}${m.qty ? " ×" + m.qty : ""}`)).join(" · ")}</p>}
                    {i.note && <p className="text-muted">Note: {i.note}</p>}</div>
                  <span>{tk(i.unitPrice)} × {i.qty} = <b>{tk(i.lineTotal)}</b></span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 grid gap-1 border-t border-line pt-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{tk(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{tk(o.deliveryCharge)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount {o.couponCode}</dt><dd>−{tk(o.discount)}</dd></div>}
              {o.adjustments.map((a) => <div key={a.id} className="flex justify-between text-muted"><dt>{a.reason} <span className="text-xs">({tk(a.oldTotal)} → {tk(a.newTotal)}, {who(a.byId)})</span></dt><dd>{a.amount >= 0 ? "+" : "−"}{tk(Math.abs(a.amount))}</dd></div>)}
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{tk(o.total)}</dd></div>
              <div className="flex justify-between text-green-700"><dt>Paid</dt><dd>{tk(o.paidAmount)}</dd></div>
              <div className="flex justify-between font-bold text-brand"><dt>Due</dt><dd>{tk(due)}</dd></div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="font-body text-lg font-bold">Payments</h2>
            {o.payments.length === 0 && <p className="text-sm text-muted">No payments yet. Method chosen: {PAYMENT_METHODS[o.paymentMethod ?? ""] ?? "—"}</p>}
            <ul className="mt-2 grid gap-2 text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2">
                  <span>{fmtDate(p.createdAt, true)} · <b>{PAYMENT_METHODS[p.method] ?? p.method}</b> · {p.kind} {p.trxId && <code className="rounded bg-cream px-1">{p.trxId}</code>} {p.proofKey && <a href={`/api/v1/files/${p.proofKey}`} target="_blank" className="text-brand underline">proof</a>}</span>
                  <span className="flex items-center gap-2"><b>{tk(p.amount)}</b><span className={`chip ${statusTone(p.status)}`}>{statusLabel(p.status)}</span>{p.status === "VERIFICATION_REQUIRED" && can(s.perms, "payments.verify") && <PaymentVerify id={p.id} />}</span>
                </li>
              ))}
              {o.refunds.map((r) => <li key={r.id} className="rounded-lg bg-red-50 p-2 text-red-800">Refund {tk(r.amount)} via {r.method} — {r.reason}</li>)}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-body text-lg font-bold">Timeline & audit</h2>
            <ol className="mt-2 grid gap-2 border-l-2 border-line pl-4 text-sm">
              {o.events.map((e) => <li key={e.id}><b>{statusLabel(e.status)}</b> <span className="text-muted">· {fmtDate(e.createdAt, true)} · {who(e.byId)}</span>{e.note && <p className="text-muted">{e.note}</p>}</li>)}
              {o.quotes.map((q) => <li key={q.id}>Quote <b>{tk(q.amount)}</b> (advance {tk(q.advanceRequired)}) — <span className={`chip ${statusTone(q.status)}`}>{statusLabel(q.status)}</span> <span className="text-muted">{fmtDate(q.createdAt, true)}</span>{q.note && <p className="text-muted">{q.note}</p>}</li>)}
            </ol>
          </section>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="card p-5 text-sm">
            <h2 className="font-body text-base font-bold">Customer</h2>
            <p className="mt-1 font-semibold">{o.customerName}</p>
            <p><a href={`tel:${o.phone}`} className="text-brand">{o.phone}</a> {o.email && <>· {o.email}</>}</p>
            <p className="mt-1">{o.fulfillment === "PICKUP" ? "Pickup from shop" : `${o.address ?? ""} (${o.zoneName ?? ""})`}</p>
            {o.deliveryDate && <p>Needed: <b>{fmtDate(o.deliveryDate, true)}</b></p>}
            {o.estimatedReadyAt && <p>Est. ready: {fmtDate(o.estimatedReadyAt, true)}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {o.user && <Link href={`/admin/customers/${o.user.id}`} className="btn-ghost btn-sm">Customer profile</Link>}
              {o.conversations[0] && <Link href={`/admin/chats/${o.conversations[0].id}`} className="btn-ghost btn-sm">Chat</Link>}
              <a href={`https://wa.me/88${o.phone}?text=${encodeURIComponent(`Hi ${o.customerName}, this is Pipilika about your order ${o.code}.`)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm text-green-700">WhatsApp</a>
            </div>
          </section>
          <OrderActions
            order={{ id: o.id, type: o.type, status: o.status, total: o.total, due, paid: o.paidAmount, notes: o.notes ?? "", hasDesign: !!d, shapeStatus: d?.shapeStatus ?? "NONE", estimatedWeightG: o.estimatedWeightG, quotedPrice: o.quotedPrice ?? d?.estimatedPrice ?? o.subtotal, shareToken: o.shareToken, hasPreview: !!d?.previewKey, deliveryCharge: o.deliveryCharge }}
            statuses={[...(o.type === "CUSTOM" ? CUSTOM_STATUSES : ORDER_STATUSES)]}
            perms={s.perms}
          />
        </aside>
      </div>
    </div>
  );
}
