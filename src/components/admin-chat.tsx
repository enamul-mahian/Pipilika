"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";

/** Re-fetches the server-rendered thread every 8s so new customer messages appear. */
export function ChatRefresher() {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => router.refresh(), 8000); return () => clearInterval(t); }, [router]);
  return null;
}

export function ChatReply({ id, status, canned, phone }: { id: string; status: string; canned: { title: string; body: string }[]; phone: string | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [wa, setWa] = useState(false);
  const a = useAction();
  const send = () => a.run(async () => { await api(`/api/v1/admin/chats/${id}`, { body: { action: "reply", body: text, whatsapp: wa } }); setText(""); router.refresh(); });
  const setStatus = (s: string) => a.run(async () => { await api(`/api/v1/admin/chats/${id}`, { body: { action: "status", status: s } }); router.refresh(); });
  return (
    <div className="grid gap-2 border-t border-line p-3">
      {canned.length > 0 && <div className="flex flex-wrap gap-1">{canned.map((c) => <button key={c.title} type="button" className="chip bg-cream hover:bg-blush" onClick={() => setText(c.body)}>{c.title}</button>)}</div>}
      <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your reply…" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }} />
      <Alert error={a.error} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary btn-sm" disabled={a.busy || !text.trim()} onClick={send}>Send</button>
        {phone && <label className="flex items-center gap-1 text-sm"><input type="checkbox" className="accent-brand" checked={wa} onChange={(e) => setWa(e.target.checked)} /> Also send on WhatsApp</label>}
        {phone && <a className="btn-ghost btn-sm" target="_blank" href={`https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "880")}`}>Open WhatsApp ↗</a>}
        <span className="ml-auto flex gap-1">{status !== "RESOLVED" ? <button className="btn-outline btn-sm" onClick={() => setStatus("RESOLVED")}>Mark resolved</button> : <button className="btn-outline btn-sm" onClick={() => setStatus("OPEN")}>Reopen</button>}</span>
      </div>
    </div>
  );
}
