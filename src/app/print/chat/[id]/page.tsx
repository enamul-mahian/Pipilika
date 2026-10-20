import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { staffCan } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { AutoPrint } from "@/components/auto-print";

export const metadata = { title: "Chat transcript", robots: { index: false } };

export default async function Transcript({ params }: { params: Promise<{ id: string }> }) {
  if (!(await staffCan("chat.use"))) redirect("/staff-login");
  const { id } = await params;
  const c = await db.conversation.findUnique({ where: { id }, include: { customer: true, order: true, messages: { orderBy: { createdAt: "asc" } } } });
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-sm text-ink">
      <AutoPrint />
      <h1 className="font-display text-3xl">Pipilika · Chat transcript</h1>
      <p className="mb-4 text-muted">{c.customer?.name ?? c.guestName} · {c.customer?.phone ?? c.guestPhone} · {c.channel}{c.order ? ` · Order ${c.order.code}` : ""} · started {fmtDate(c.createdAt, true)}</p>
      <table className="w-full border-collapse">
        <tbody>{c.messages.map((m) => <tr key={m.id} className="border-b border-line align-top"><td className="w-40 py-2 pr-3 text-xs text-muted">{fmtDate(m.createdAt, true)}<br /><b>{m.senderName ?? m.senderType}</b></td><td className="whitespace-pre-wrap py-2">{m.body}{m.attachmentKey ? " [image attached]" : ""}</td></tr>)}</tbody>
      </table>
      <p className="mt-6 text-xs text-muted">Printed {fmtDate(new Date(), true)}. Use your browser&apos;s “Save as PDF” to download.</p>
    </div>
  );
}
