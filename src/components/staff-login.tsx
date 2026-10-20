"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";

export function StaffLogin({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [f, setF] = useState({ email: "", password: "", code: "", newPassword: "" });
  const [sent, setSent] = useState<string | null>(null);
  const a = useAction();
  if (mode === "reset")
    return (
      <form className="card grid gap-3 p-6" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/auth/staff/reset", { body: { email: f.email, code: f.code, password: f.newPassword } }); setMode("login"); }, "Password changed. Please log in."); }}>
        <h2 className="font-body text-lg font-bold">Reset password</h2>
        <input className="input" type="email" required placeholder="Staff email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <button type="button" className="btn-outline btn-sm" onClick={() => a.run(async () => { const r = await api<{ devCode?: string }>("/api/v1/auth/otp/request", { body: { target: f.email, purpose: "reset" } }); setSent(r.devCode ?? "sent"); })}>Send reset code</button>
        {sent && sent !== "sent" && <p className="text-sm text-amber-800">Dev code: <b>{sent}</b></p>}
        <input className="input" required inputMode="numeric" placeholder="6-digit code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input className="input" type="password" required minLength={10} placeholder="New password (min 10 chars, letters + numbers)" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        <Alert error={a.error} msg={a.msg} />
        <button className="btn-primary" disabled={a.busy}>Change password</button>
        <button type="button" className="text-sm text-muted underline" onClick={() => setMode("login")}>Back to login</button>
      </form>
    );
  return (
    <form className="card grid gap-3 p-6" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/auth/staff/login", { body: { email: f.email, password: f.password } }); router.replace(next); router.refresh(); }); }}>
      <label className="label" htmlFor="e">Email</label>
      <input id="e" className="input" type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <label className="label" htmlFor="p">Password</label>
      <input id="p" className="input" type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Alert error={a.error} msg={a.msg} />
      <button className="btn-primary" disabled={a.busy}>{a.busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="text-sm text-muted underline" onClick={() => setMode("reset")}>Forgot password?</button>
    </form>
  );
}
