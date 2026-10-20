import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate, tk, statusLabel } from "@/lib/format";
import { ChatReply, ChatRefresher } from "@/components/admin-chat";

export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.conversation.findUnique({ where: { id }, include: { customer: true, order: true, messages: { orderBy: { createdAt: "asc" } } } });
  if (!c) notFound();
  const canned = await db.cannedReply.findMany();
  const phone = c.customer?.phone ?? c.guestPhone;
  const recent = phone ? await db.order.findMany({ where: { phone }, orderBy: { createdAt: "desc" }, take: 5 }) : [];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <ChatRefresher />
      <div className="card flex min-h-[70vh] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
          <div><Link href="/admin/chats" className="text-sm text-muted">← Chats</Link><h1 className="text-2xl">{c.customer?.name ?? c.guestName ?? "Guest"}</h1><p className="text-xs text-muted">{phone} · {c.channel}</p></div>
          <a href={`/print/chat/${c.id}`} target="_blank" className="btn-outline btn-sm">Transcript / PDF</a>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {c.messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.senderType === "STAFF" ? "ml-auto bg-brand text-white" : m.senderType === "SYSTEM" ? "mx-auto bg-line text-xs" : "bg-cream"}`}>
              {m.attachmentKey && /* eslint-disable-next-line @next/next/no-img-element */ <a href={`/api/v1/files/${m.attachmentKey}`} target="_blank"><img src={`/api/v1/files/${m.attachmentKey}`} alt="Attachment" className="mb-1 max-h-48 rounded-lg" /></a>}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.senderType === "STAFF" ? "text-white/70" : "text-muted"}`}>{m.senderName} · {fmtDate(m.createdAt, true)}</p>
            </div>
          ))}
        </div>
        <ChatReply id={c.id} status={c.status} canned={canned.map((x) => ({ title: x.title, body: x.body }))} phone={phone ?? null} />
      </div>
      <aside className="grid content-start gap-4">
        {c.order && <div className="card p-4 text-sm"><h2 className="mb-1 font-body font-bold">Linked order</h2><Link href={`/admin/orders/${c.order.id}`} className="text-brand">{c.order.code}</Link> · {statusLabel(c.order.status)} · {tk(c.order.total)}</div>}
        <div className="card p-4 text-sm"><h2 className="mb-1 font-body font-bold">Recent orders</h2>{recent.length ? recent.map((o) => <p key={o.id}><Link href={`/admin/orders/${o.id}`} className="text-brand">{o.code}</Link> · {statusLabel(o.status)} · {tk(o.total)}</p>) : <p className="text-muted">None.</p>}</div>
        {c.customer && <Link href={`/admin/customers/${c.customer.id}`} className="btn-outline btn-sm">Customer profile</Link>}
      </aside>
    </div>
  );
}
