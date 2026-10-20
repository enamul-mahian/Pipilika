"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert, fileToDataUrl } from "./ui";

export type Field = {
  key: string; label: string;
  type?: "text" | "number" | "select" | "checkbox" | "date" | "textarea" | "tags" | "image" | "json";
  options?: { value: string; label: string }[]; required?: boolean; placeholder?: string; hideInTable?: boolean; width?: string; readOnly?: boolean;
};

const toForm = (fields: Field[], row?: any) => {
  const o: Record<string, any> = {};
  for (const f of fields) {
    const v = row?.[f.key];
    o[f.key] = f.type === "checkbox" ? (row ? !!v : true) : f.type === "tags" ? (v ?? []).join(", ") : f.type === "date" ? (v ? String(v).slice(0, 10) : "") : f.type === "json" ? (v ? JSON.stringify(v) : "") : v ?? (f.type === "select" ? f.options?.[0]?.value ?? "" : "");
  }
  return o;
};

export function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {value && <img src={value} alt="" className="h-10 w-10 rounded object-cover" />}
      <input className="input !py-1.5 text-xs" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="/demo/x.jpg or upload" />
      <label className="btn-outline btn-sm shrink-0 cursor-pointer">{busy ? "…" : "Upload"}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setBusy(true);
          try { const r = await api<{ url: string }>("/api/v1/admin/upload", { body: { file: await fileToDataUrl(f, 1600) } }); onChange(r.url); } catch (err) { alert((err as Error).message); }
          setBusy(false);
        }} />
      </label>
    </div>
  );
}

export function Input({ f, value, set }: { f: Field; value: any; set: (v: any) => void }) {
  const id = "f_" + f.key;
  if (f.type === "checkbox") return <label className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" className="h-4 w-4 accent-brand" checked={!!value} onChange={(e) => set(e.target.checked)} />{f.label}</label>;
  if (f.type === "select") return <select id={id} className="input !py-2" value={value} onChange={(e) => set(e.target.value)}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  if (f.type === "textarea" || f.type === "json") return <textarea id={id} className="input font-mono text-xs" rows={2} value={value} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />;
  if (f.type === "image") return <ImageInput value={value} onChange={set} />;
  return <input id={id} className="input !py-2" type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} required={f.required} value={value} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />;
}

const show = (f: Field, v: any) => {
  if (f.type === "checkbox") return v ? "✓" : "—";
  if (f.type === "image") return v ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={v} alt="" className="h-10 w-10 rounded object-cover" /> : "—";
  if (f.type === "tags") return (v ?? []).join(", ") || "—";
  if (f.type === "date") return v ? String(v).slice(0, 10) : "—";
  if (f.type === "json") return v ? <code className="text-xs">{JSON.stringify(v)}</code> : "—";
  if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? v;
  return v ?? "—";
};

/** Generic admin table with add / inline edit / delete against /api/v1/admin/r/[resource]. */
export function Crud({ resource, fields, rows, title, canDelete = true, canAdd = true, extra }: { resource: string; fields: Field[]; rows: any[]; title?: string; canDelete?: boolean; canAdd?: boolean; extra?: (row: any) => React.ReactNode }) {
  const router = useRouter();
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(() => toForm(fields));
  const [adding, setAdding] = useState(false);
  const a = useAction();
  const save = (id?: string) =>
    a.run(async () => {
      await api(`/api/v1/admin/r/${resource}`, { method: id ? "PATCH" : "POST", body: id ? { ...form, id } : form });
      setEdit(null); setAdding(false); setForm(toForm(fields));
      router.refresh();
    }, "Saved");
  const del = (id: string) => window.confirm("Delete this item? This cannot be undone.") && a.run(async () => { await api(`/api/v1/admin/r/${resource}?id=${id}`, { method: "DELETE" }); router.refresh(); }, "Deleted");
  const cols = fields.filter((f) => !f.hideInTable);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <h2 className="font-body text-lg font-bold">{title}</h2>
        {canAdd && !adding && <button className="btn-primary btn-sm" onClick={() => { setForm(toForm(fields)); setAdding(true); setEdit(null); }}>+ Add</button>}
      </div>
      <div className="px-4 pt-3"><Alert error={a.error} msg={a.msg} /></div>
      {adding && (
        <form className="grid gap-3 border-b border-line bg-cream p-4 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {fields.filter((f) => !f.readOnly).map((f) => <div key={f.key} className={f.type === "textarea" || f.type === "json" || f.type === "image" ? "md:col-span-3" : ""}>{f.type !== "checkbox" && <label className="label" htmlFor={"f_" + f.key}>{f.label}</label>}<Input f={f} value={form[f.key]} set={(v) => setForm({ ...form, [f.key]: v })} /></div>)}
          <div className="flex gap-2 md:col-span-3"><button className="btn-primary btn-sm" disabled={a.busy}>Save</button><button type="button" className="btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr>{cols.map((f) => <th key={f.key}>{f.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={cols.length + 1} className="py-8 text-center text-muted">Nothing here yet.</td></tr>}
            {rows.map((r) => edit === r.id ? (
              <tr key={r.id} className="bg-cream">
                {cols.map((f) => <td key={f.key}>{f.readOnly ? show(f, r[f.key]) : <Input f={f} value={form[f.key]} set={(v) => setForm({ ...form, [f.key]: v })} />}</td>)}
                <td className="whitespace-nowrap"><button className="btn-primary btn-sm" disabled={a.busy} onClick={() => save(r.id)}>Save</button> <button className="btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancel</button></td>
              </tr>
            ) : (
              <tr key={r.id}>
                {cols.map((f) => <td key={f.key}>{show(f, r[f.key])}</td>)}
                <td className="whitespace-nowrap text-right">{extra?.(r)} <button className="btn-ghost btn-sm" onClick={() => { setForm(toForm(fields, r)); setEdit(r.id); setAdding(false); }}>Edit</button>{canDelete && <button className="btn-ghost btn-sm text-red-700" onClick={() => del(r.id)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
