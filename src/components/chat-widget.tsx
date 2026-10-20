"use client";
import { useEffect, useRef, useState } from "react";
import { api, fileToDataUrl } from "./ui";
import { IconChat, IconX, IconWhatsapp } from "./icons";
import { track } from "./analytics";

type Msg = { id: string; senderType: string; senderName: string | null; body: string; hasFile: boolean; fileKey: string | null; at: string };

export function ChatWidget({ whatsapp }: { whatsapp: string }) {
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState<{ id: string; status: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", orderCode: "" });
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await api<{ conversation: any; messages: Msg[] }>("/api/v1/chat");
      setConv(r.conversation);
      setMsgs(r.messages);
    } catch {}
    setLoaded(true);
  };
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [open]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length]);

  const send = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/chat", { body: payload });
      setText("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-3 flex h-[min(520px,75vh)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div><b>Chat with Pipilika</b><p className="text-xs text-white/80">We usually reply within minutes</p></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><IconX /></button>
          </div>
          {!loaded ? <p className="p-4 text-sm text-muted">Loading…</p> : !conv ? (
            <form className="grid gap-3 p-4" onSubmit={(e) => { e.preventDefault(); track("chat_started"); send({ action: "start", ...f }); }}>
              <p className="text-sm">Hi! 👋 Tell us who you are and we&apos;ll help with orders, custom cakes or anything else.</p>
              <input className="input" placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Your name" />
              <input className="input" placeholder="Phone (01XXXXXXXXX)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="Phone" />
              <input className="input" placeholder="Order code (optional)" value={f.orderCode} onChange={(e) => setF({ ...f, orderCode: e.target.value })} aria-label="Order code" />
              {err && <p className="text-sm text-red-700">{err}</p>}
              <button className="btn-primary" disabled={busy}>Start chat</button>
              <p className="text-center text-xs text-muted">Logged-in customers can skip the form.</p>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto bg-cream p-3">
                {msgs.length === 0 && <p className="text-center text-sm text-muted">Send us a message to begin.</p>}
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.senderType === "CUSTOMER" ? "ml-auto bg-brand text-white" : "bg-white shadow-sm"}`}>
                    {m.senderType !== "CUSTOMER" && <b className="block text-xs text-brand">{m.senderName ?? "Pipilika"}</b>}
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {m.fileKey && <img src={`/api/v1/files/${m.fileKey}`} alt="Attachment" className="mt-1 max-h-40 rounded-lg" />}
                  </div>
                ))}
                <div ref={end} />
              </div>
              <form className="flex items-center gap-2 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send({ action: "send", body: text }); }}>
                <label className="cursor-pointer px-1 text-xl" aria-label="Attach image">📎<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) send({ action: "send", body: "", file: await fileToDataUrl(file, 1400) }); }} /></label>
                <input className="input !py-2" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message" />
                <button className="btn-primary btn-sm" disabled={busy}>Send</button>
              </form>
              {err && <p className="px-3 pb-2 text-xs text-red-700">{err}</p>}
            </>
          )}
          {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_clicked")} className="flex items-center justify-center gap-2 border-t border-line py-2 text-sm font-semibold text-green-700 hover:bg-green-50"><IconWhatsapp className="h-4 w-4" /> Prefer WhatsApp?</a>}
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-deep" aria-label={open ? "Close chat" : "Open chat"}>
        {open ? <IconX className="h-6 w-6" /> : <IconChat className="h-6 w-6" />}
      </button>
    </div>
  );
}
