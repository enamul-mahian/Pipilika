"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";

type S = { id: string; name: string; email: string; phone: string; roleId: string; role: string; isActive: boolean; lastLogin: string };

export function StaffEditor({ staff, roles }: { staff: S[]; roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const a = useAction();
  const blank = { id: "", name: "", email: "", phone: "", roleId: roles[0]?.id ?? "", isActive: true, password: "" };
  const [f, setF] = useState<typeof blank | null>(null);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-4"><h2 className="font-body text-lg font-bold">Staff accounts</h2><button className="btn-primary btn-sm" onClick={() => setF(blank)}>+ Add staff</button></div>
      {f && (
        <form className="grid gap-3 border-b border-line bg-cream p-4 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/admin/staff", { body: { ...f, id: f.id || undefined, password: f.password || undefined } }); setF(null); router.refresh(); }, "Saved"); }}>
          <div><label className="label">Name</label><input className="input !py-2" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label">Email (login)</label><input className="input !py-2" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input !py-2" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><label className="label">Role</label><select className="input !py-2" value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div><label className="label">{f.id ? "New password (optional)" : "Password"}</label><input className="input !py-2" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="10+ chars, letters & numbers" /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="accent-brand" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Active</label>
          <div className="md:col-span-3"><Alert error={a.error} /></div>
          <div className="flex gap-2"><button className="btn-primary btn-sm" disabled={a.busy}>Save</button><button type="button" className="btn-ghost btn-sm" onClick={() => setF(null)}>Cancel</button></div>
        </form>
      )}
      <div className="overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Login</th><th>Role</th><th>Status</th><th>Last login</th><th /></tr></thead><tbody>
        {staff.map((s) => <tr key={s.id}><td className="font-semibold">{s.name}</td><td>{s.email}<br /><span className="text-xs text-muted">{s.phone}</span></td><td>{s.role}</td><td>{s.isActive ? <span className="chip bg-green-100 text-green-800">Active</span> : <span className="chip bg-line">Disabled</span>}</td><td className="text-xs">{s.lastLogin}</td><td className="text-right"><button className="btn-ghost btn-sm" onClick={() => setF({ id: s.id, name: s.name, email: s.email, phone: s.phone, roleId: s.roleId, isActive: s.isActive, password: "" })}>Edit</button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
