"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";
import { Captcha } from "./captcha";

export function OtpLogin({ next, sitekey }: { next: string; sitekey: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<"target" | "code">("target");
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [dev, setDev] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [cool, setCool] = useState(0);
  const a = useAction();
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t); }, [cool]);

  const send = () =>
    a.run(async () => {
      const r = await api<{ isNew: boolean; devCode?: string; channel: string }>("/api/v1/auth/otp/request", { body: { target, captcha } });
      setIsNew(r.isNew);
      setDev(r.devCode ?? null);
      setStage("code");
      setCool(60);
    });
  const verify = () =>
    a.run(async () => {
      const r = await api<{ kind: string }>("/api/v1/auth/otp/verify", { body: { target, code, name: isNew ? name : undefined } });
      router.replace(r.kind === "STAFF" && next === "/account" ? "/admin" : next);
      router.refresh();
    });

  return (
    <div className="card mt-6 p-6">
      {stage === "target" ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="grid gap-4">
          <div>
            <label className="label" htmlFor="t">Mobile number or email</label>
            <input id="t" required autoFocus className="input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="01XXXXXXXXX or you@email.com" autoComplete="username" />
          </div>
          <Captcha sitekey={sitekey} onToken={setCaptcha} />
          <Alert error={a.error} />
          <button className="btn-primary" disabled={a.busy}>{a.busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="grid gap-4">
          <p className="text-sm">We sent a 6-digit code to <b>{target}</b>. <button type="button" className="text-brand underline" onClick={() => setStage("target")}>Change</button></p>
          {dev && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Development mode — your code is <b className="font-mono">{dev}</b></p>}
          <div>
            <label className="label" htmlFor="c">Verification code</label>
            <input id="c" required autoFocus inputMode="numeric" maxLength={6} className="input text-center font-mono text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" />
          </div>
          {isNew && <div><label className="label" htmlFor="n">Your name</label><input id="n" required className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>}
          <Alert error={a.error} />
          <button className="btn-primary" disabled={a.busy || code.length !== 6}>{a.busy ? "Verifying…" : isNew ? "Create account" : "Log in"}</button>
          <button type="button" className="text-sm text-muted underline disabled:no-underline" disabled={cool > 0 || a.busy} onClick={send}>{cool > 0 ? `Resend code in ${cool}s` : "Resend code"}</button>
        </form>
      )}
    </div>
  );
}
