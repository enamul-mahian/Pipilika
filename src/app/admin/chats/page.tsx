import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { Crud } from "@/components/crud";

const TONE: Record<string, string> = { OPEN: "bg-red-100 text-red-700", WAITING: "bg-amber-100 text-amber-900", RESOLVED: "bg-green-100 text-green-800" };

export default async function Chats({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [convs, canned] = await Promise.all([
    db.conversation.findMany({ where: status ? { status } : { status: { not: "RESOLVED" } }, orderBy: { lastMessageAt: "desc" }, take: 100, include: { customer: true, order: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    db.cannedReply.findMany(),
  ]);
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Chats</h1>
      <div className="flex flex-wrap gap-2">{[["", "Active"], ["OPEN", "Needs reply"], ["WAITING", "Waiting for customer"], ["RESOLVED", "Resolved"]].map(([v, l]) => <Link key={v} href={v ? `?status=${v}` : "?"} className={`tab ${(status ?? "") === v ? "tab-on" : ""}`}>{l}</Link>)}</div>
      <div className="card divide-y divide-line">
        {convs.length === 0 && <p className="p-8 text-center text-muted">No conversations.</p>}
        {convs.map((c) => (
          <Link key={c.id} href={`/admin/chats/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-cream">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush font-bold text-brand">{(c.customer?.name ?? c.guestName ?? "G")[0]}</span>
            <span className="min-w-0 flex-1">
              <b className="block">{c.customer?.name ?? c.guestName ?? "Guest"} <span className="text-xs font-normal text-muted">{c.customer?.phone ?? c.guestPhone} {c.channel === "WHATSAPP" && "· WhatsApp"} {c.order && `· ${c.order.code}`}</span></b>
              <span className="block truncate text-sm text-muted">{c.messages[0]?.senderType === "STAFF" ? "You: " : ""}{c.messages[0]?.body}</span>
            </span>
            <span className="text-right text-xs"><span className={`chip ${TONE[c.status]}`}>{c.status}</span><br /><span className="text-muted">{fmtDate(c.lastMessageAt, true)}</span></span>
          </Link>
        ))}
      </div>
      <Crud resource="canned-replies" title="Saved quick replies" rows={canned} fields={[{ key: "title", label: "Title", required: true }, { key: "body", label: "Message", type: "textarea", required: true }]} />
    </div>
  );
}
