"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";
import { ImageInput } from "./crud";
import type { SiteSettings, NavLink } from "@/lib/settings";

type Block = { id: string; type: string; props: Record<string, any> };
type BlockTypes = Record<string, { label: string; defaults: Record<string, any> }>;
const uid = () => Math.random().toString(36).slice(2, 9);

const HINTS: Record<string, string> = {
  features: "One per line. In feature bars use: Bold text|small text",
  items: "One per line. FAQ: Question|Answer · Features: Title|subtitle",
  source: "featured, best, new or category",
};

function PropField({ k, v, set, categories }: { k: string; v: any; set: (v: any) => void; categories: string[] }) {
  const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  if (k === "image") return <div><label className="label">{label}</label><ImageInput value={v ?? ""} onChange={set} /></div>;
  if (k === "source") return <div><label className="label">{label}</label><select className="input !py-2" value={v} onChange={(e) => set(e.target.value)}><option value="featured">Featured</option><option value="best">Best sellers</option><option value="new">Newest</option><option value="category">From a category</option></select></div>;
  if (k === "category") return <div><label className="label">{label}</label><select className="input !py-2" value={v} onChange={(e) => set(e.target.value)}><option value="">—</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>;
  if (typeof v === "number") return <div><label className="label">{label}</label><input type="number" className="input !py-2" value={v} onChange={(e) => set(Number(e.target.value))} /></div>;
  const long = typeof v === "string" && (v.includes("\n") || v.length > 70 || ["body", "text", "items", "features", "subtitle"].includes(k));
  return <div className={long ? "sm:col-span-2" : ""}><label className="label">{label}</label>{long ? <textarea className="input" rows={Math.min(8, Math.max(2, String(v ?? "").split("\n").length + 1))} value={v ?? ""} onChange={(e) => set(e.target.value)} /> : <input className="input !py-2" value={v ?? ""} onChange={(e) => set(e.target.value)} />}{HINTS[k] && <p className="mt-1 text-xs text-muted">{HINTS[k]}</p>}</div>;
}

export function PageEditor({ page, types, categories }: { page: { id: string; slug: string; title: string; isPublished: boolean; isSystem: boolean; showInMenu: boolean; seoTitle: string; seoDesc: string; ogImage: string; noindex: boolean; blocks: Block[] }; types: BlockTypes; categories: string[] }) {
  const router = useRouter();
  const a = useAction();
  const [blocks, setBlocks] = useState<Block[]>(page.blocks);
  const [meta, setMeta] = useState({ title: page.title, showInMenu: page.showInMenu, seoTitle: page.seoTitle, seoDesc: page.seoDesc, ogImage: page.ogImage, noindex: page.noindex });
  const [open, setOpen] = useState<string | null>(blocks[0]?.id ?? null);
  const [add, setAdd] = useState(Object.keys(types)[0]);
  const href = page.slug === "home" ? "/" : `/${page.slug}`;
  const move = (i: number, d: number) => { const b = [...blocks]; const j = i + d; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]]; setBlocks(b); };
  const setProp = (id: string, k: string, v: any) => setBlocks(blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [k]: v } } : b)));
  const send = (action: string, msg: string) => a.run(async () => { await api("/api/v1/admin/pages", { body: { action, id: page.id, blocks, ...meta, seoTitle: meta.seoTitle || null, seoDesc: meta.seoDesc || null, ogImage: meta.ogImage || null } }); router.refresh(); }, msg);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><a href="/admin/site" className="text-sm text-muted">← Site editor</a><h1 className="text-3xl">{meta.title}</h1><p className="text-xs text-muted">{href} · {page.isPublished ? "published" : "hidden"}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline btn-sm" disabled={a.busy} onClick={() => send("save", "Draft saved")}>Save draft</button>
          <a className="btn-outline btn-sm" href={`${href}?preview=1`} target="_blank" onClick={() => send("save", "Draft saved")}>Preview ↗</a>
          <button className="btn-primary btn-sm" disabled={a.busy} onClick={() => send("publish", "Published! Changes are live.")}>Publish</button>
          {page.isPublished && page.slug !== "home" && <button className="btn-ghost btn-sm" onClick={() => send("unpublish", "Page hidden")}>Hide page</button>}
          {!page.isSystem && <button className="btn-ghost btn-sm text-red-700" onClick={() => window.confirm("Delete this page?") && a.run(async () => { await api("/api/v1/admin/pages", { body: { action: "delete", id: page.id } }); router.push("/admin/site"); })}>Delete</button>}
        </div>
      </div>
      <Alert error={a.error} msg={a.msg} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-3">
          {blocks.length === 0 && <p className="card p-6 text-center text-muted">No sections. Add one below.</p>}
          {blocks.map((b, i) => (
            <div key={b.id} className="card overflow-hidden">
              <div className="flex items-center gap-2 bg-cream px-4 py-2">
                <button className="flex-1 text-left font-semibold" onClick={() => setOpen(open === b.id ? null : b.id)}>{i + 1}. {types[b.type]?.label ?? b.type} <span className="text-xs font-normal text-muted">{String(b.props.title ?? "").slice(0, 40)}</span></button>
                <button className="btn-ghost btn-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="btn-ghost btn-sm" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="btn-ghost btn-sm" aria-label="Duplicate" onClick={() => setBlocks([...blocks.slice(0, i + 1), { ...b, id: uid(), props: { ...b.props } }, ...blocks.slice(i + 1)])}>⧉</button>
                <button className="btn-ghost btn-sm text-red-700" aria-label="Remove" onClick={() => window.confirm("Remove this section?") && setBlocks(blocks.filter((x) => x.id !== b.id))}>✕</button>
              </div>
              {open === b.id && <div className="grid gap-3 p-4 sm:grid-cols-2">{Object.keys({ ...(types[b.type]?.defaults ?? {}), ...b.props }).map((k) => <PropField key={k} k={k} v={b.props[k] ?? types[b.type]?.defaults[k]} set={(v) => setProp(b.id, k, v)} categories={categories} />)}</div>}
            </div>
          ))}
          <div className="card flex flex-wrap items-center gap-2 p-3">
            <select className="input !w-56 !py-2" value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Section type">{Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <button className="btn-outline btn-sm" onClick={() => { const nb = { id: uid(), type: add, props: { ...types[add].defaults } }; setBlocks([...blocks, nb]); setOpen(nb.id); }}>+ Add section</button>
          </div>
        </div>
        <aside className="card grid content-start gap-3 p-4">
          <h2 className="font-body text-lg font-bold">Page settings & SEO</h2>
          <div><label className="label">Title</label><input className="input !py-2" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={meta.showInMenu} onChange={(e) => setMeta({ ...meta, showInMenu: e.target.checked })} /> Show in header menu</label>
          <div><label className="label">SEO title</label><input className="input !py-2" value={meta.seoTitle} onChange={(e) => setMeta({ ...meta, seoTitle: e.target.value })} /></div>
          <div><label className="label">SEO description</label><textarea className="input" rows={3} value={meta.seoDesc} onChange={(e) => setMeta({ ...meta, seoDesc: e.target.value })} /></div>
          <div><label className="label">Share image</label><ImageInput value={meta.ogImage} onChange={(v) => setMeta({ ...meta, ogImage: v })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={meta.noindex} onChange={(e) => setMeta({ ...meta, noindex: e.target.checked })} /> Hide from Google (noindex)</label>
          <p className="text-xs text-muted">Changes are saved as a draft. Visitors only see them after you press Publish.</p>
        </aside>
      </div>
    </div>
  );
}

export function NewPageForm() {
  const router = useRouter();
  const a = useAction();
  const [title, setTitle] = useState("");
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); a.run(async () => { const p = await api<{ id: string }>("/api/v1/admin/pages", { body: { action: "create", title, slug } }); router.push(`/admin/site/${p.id}`); }); }}>
      <input className="input !w-52 !py-2" placeholder="New page title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <button className="btn-primary btn-sm" disabled={a.busy || !slug}>+ Create page</button>
      {a.error && <span className="text-sm text-red-700">{a.error}</span>}
    </form>
  );
}

const linksToText = (l: NavLink[]) => l.map((x) => `${x.label}|${x.href}`).join("\n");
const textToLinks = (t: string): NavLink[] => t.split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0]).map(([label, href]) => ({ label, href: href || "/" }));

export function LayoutEditor({ store, header, footer }: Pick<SiteSettings, "store" | "header" | "footer">) {
  const router = useRouter();
  const a = useAction();
  const [st, setSt] = useState(store);
  const [menu, setMenu] = useState(linksToText(header.menu));
  const [ann, setAnn] = useState(header.announcement);
  const [ft, setFt] = useState(footer);
  const [cols, setCols] = useState(footer.columns.map((c) => ({ title: c.title, text: linksToText(c.links) })));
  const save = () => a.run(async () => {
    await api("/api/v1/admin/settings", { body: { key: "store", value: st } });
    await api("/api/v1/admin/settings", { body: { key: "header", value: { announcement: ann, menu: textToLinks(menu) } } });
    await api("/api/v1/admin/settings", { body: { key: "footer", value: { ...ft, columns: cols.filter((c) => c.title).map((c) => ({ title: c.title, links: textToLinks(c.text) })) } } });
    router.refresh();
  }, "Header, footer and logo saved — live now");
  return (
    <div className="card grid gap-4 p-4">
      <h2 className="font-body text-lg font-bold">Logo, header & footer</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Logo (PNG with transparent background works best)</label><ImageInput value={st.logo} onChange={(v) => setSt({ ...st, logo: v })} /></div>
        <div><label className="label">Favicon (small icon in the browser tab, square PNG, e.g. 512×512 — blank = use logo)</label><ImageInput value={st.favicon ?? ""} onChange={(v) => setSt({ ...st, favicon: v })} /></div>
        <div><label className="label">Shop name</label><input className="input !py-2" value={st.name} onChange={(e) => setSt({ ...st, name: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label">Announcement bar (top of every page, blank = hidden)</label><input className="input !py-2" value={ann} onChange={(e) => setAnn(e.target.value)} /></div>
        <div><label className="label">Header menu — one per line: Label|/link</label><textarea className="input font-mono text-xs" rows={8} value={menu} onChange={(e) => setMenu(e.target.value)} /></div>
        <div className="grid content-start gap-3">
          <div><label className="label">Phone</label><input className="input !py-2" value={st.phone} onChange={(e) => setSt({ ...st, phone: e.target.value })} /></div>
          <div><label className="label">WhatsApp number (8801…)</label><input className="input !py-2" value={st.whatsapp} onChange={(e) => setSt({ ...st, whatsapp: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input !py-2" value={st.email} onChange={(e) => setSt({ ...st, email: e.target.value })} /></div>
          <div><label className="label">Address</label><input className="input !py-2" value={st.address} onChange={(e) => setSt({ ...st, address: e.target.value })} /></div>
          <div><label className="label">Opening hours</label><input className="input !py-2" value={st.hours} onChange={(e) => setSt({ ...st, hours: e.target.value })} /></div>
        </div>
      </div>
      <h3 className="font-body font-bold">Footer</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Quote</label><input className="input !py-2" value={ft.quote} onChange={(e) => setFt({ ...ft, quote: e.target.value })} /></div>
        <div><label className="label">Copyright</label><input className="input !py-2" value={ft.copyright} onChange={(e) => setFt({ ...ft, copyright: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label">About text</label><textarea className="input" rows={2} value={ft.about} onChange={(e) => setFt({ ...ft, about: e.target.value })} /></div>
        {cols.map((c, i) => (
          <div key={i}><label className="label">Column {i + 1} title</label><input className="input mb-1 !py-2" value={c.title} onChange={(e) => setCols(cols.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /><textarea className="input font-mono text-xs" rows={5} value={c.text} onChange={(e) => setCols(cols.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Label|/link" /></div>
        ))}
        <button type="button" className="btn-outline btn-sm justify-self-start" onClick={() => setCols([...cols, { title: "", text: "" }])}>+ Footer column</button>
        <div className="grid gap-2 md:col-span-2 md:grid-cols-4">{(["facebook", "instagram", "youtube", "tiktok"] as const).map((k) => <div key={k}><label className="label capitalize">{k}</label><input className="input !py-2" value={ft.social[k]} onChange={(e) => setFt({ ...ft, social: { ...ft.social, [k]: e.target.value } })} placeholder="https://" /></div>)}</div>
      </div>
      <Alert error={a.error} msg={a.msg} />
      <div><button className="btn-primary" disabled={a.busy} onClick={save}>Save & publish layout</button></div>
    </div>
  );
}
