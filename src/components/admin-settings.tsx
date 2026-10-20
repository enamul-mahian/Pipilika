"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert } from "./ui";
import { ImageInput } from "./crud";
import type { SiteSettings } from "@/lib/settings";

const TABS = [["payments", "Payments"], ["seo", "SEO"], ["analytics", "Analytics & pixels"], ["features", "Features on/off"], ["notifications", "Message templates"], ["app", "Mobile app"], ["store", "Store info"]] as const;
const METHOD_LABEL: Record<string, string> = { BKASH: "bKash", NAGAD: "Nagad", BANGLA_QR: "Bangla QR", BANK: "Bank transfer", COD: "Cash on delivery", CARD: "Card" };
const FEATURE_LABEL: Record<string, string> = { shapeDesigner: "Custom shape designer", wafflePrint: "Waffle print", sugarPrint: "Sugar sheet print", reviews: "Product reviews", chat: "Live chat widget", whatsapp: "WhatsApp button", wishlist: "Wishlist" };

export function SettingsEditor({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const a = useAction();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("payments");
  const [s, setS] = useState<SiteSettings>(initial);
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS({ ...s, [k]: v });
  const save = () => a.run(async () => { await api("/api/v1/admin/settings", { body: { key: tab, value: s[tab] } }); router.refresh(); }, "Saved");
  const text = (label: string, v: string, on: (v: string) => void, ph?: string) => <div><label className="label">{label}</label><input className="input !py-2" value={v} onChange={(e) => on(e.target.value)} placeholder={ph} /></div>;
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Settings & SEO</h1>
      <div className="flex flex-wrap gap-1">{TABS.map(([k, l]) => <button key={k} className={`tab ${tab === k ? "tab-on" : ""}`} onClick={() => { setTab(k); a.setMsg(null); }}>{l}</button>)}</div>
      <div className="card grid gap-4 p-4">
        {tab === "payments" && <>
          <div className="max-w-xs">{text("Advance for custom cakes (%)", String(s.payments.advancePercent), (v) => set("payments", { ...s.payments, advancePercent: Number(v) || 0 }))}</div>
          {Object.entries(s.payments.methods).map(([k, m]) => (
            <div key={k} className="grid gap-2 rounded-xl border border-line p-3">
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="accent-brand" checked={m.enabled} onChange={(e) => set("payments", { ...s.payments, methods: { ...s.payments.methods, [k]: { ...m, enabled: e.target.checked } } })} /> {METHOD_LABEL[k] ?? k}</label>
              <textarea className="input text-sm" rows={2} value={m.instructions} onChange={(e) => set("payments", { ...s.payments, methods: { ...s.payments.methods, [k]: { ...m, instructions: e.target.value } } })} />
            </div>
          ))}
          <div><label className="label">Bangla QR image (upload your merchant QR; blank = demo QR)</label><ImageInput value={(s.payments as any).qrImage ?? ""} onChange={(v) => set("payments", { ...s.payments, qrImage: v } as any)} /></div>
        </>}
        {tab === "seo" && <>
          {text("Default page title", s.seo.defaultTitle, (v) => set("seo", { ...s.seo, defaultTitle: v }))}
          {text("Title template (%s = page name)", s.seo.titleTemplate, (v) => set("seo", { ...s.seo, titleTemplate: v }))}
          <div><label className="label">Meta description</label><textarea className="input" rows={3} value={s.seo.description} onChange={(e) => set("seo", { ...s.seo, description: e.target.value })} /></div>
          {text("Keywords", s.seo.keywords, (v) => set("seo", { ...s.seo, keywords: v }))}
          <div><label className="label">Default share image</label><ImageInput value={s.seo.ogImage} onChange={(v) => set("seo", { ...s.seo, ogImage: v })} /></div>
          <p className="text-xs text-muted">Sitemap: /sitemap.xml · Robots: /robots.txt — generated automatically.</p>
        </>}
        {tab === "analytics" && <>
          {text("Google Analytics 4 ID", s.analytics.ga4, (v) => set("analytics", { ...s.analytics, ga4: v }), "G-XXXXXXX")}
          {text("Google Tag Manager ID", s.analytics.gtm, (v) => set("analytics", { ...s.analytics, gtm: v }), "GTM-XXXXXX")}
          {text("Meta (Facebook) Pixel ID", s.analytics.metaPixel, (v) => set("analytics", { ...s.analytics, metaPixel: v }), "1234567890")}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={s.analytics.requireConsent} onChange={(e) => set("analytics", { ...s.analytics, requireConsent: e.target.checked })} /> Ask visitors for cookie consent before tracking</label>
        </>}
        {tab === "features" && <div className="grid gap-2 sm:grid-cols-2">{Object.entries(s.features).map(([k, v]) => <label key={k} className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-brand" checked={v} onChange={(e) => set("features", { ...s.features, [k]: e.target.checked })} /> {FEATURE_LABEL[k] ?? k}</label>)}</div>}
        {tab === "notifications" && <>
          <p className="text-sm text-muted">Placeholders: {"{code} {total} {amount} {status}"}</p>
          {Object.entries(s.notifications).map(([k, v]) => <div key={k}><label className="label">{k.replace(/_/g, " ").toLowerCase()}</label><textarea className="input text-sm" rows={2} value={v} onChange={(e) => set("notifications", { ...s.notifications, [k]: e.target.value })} /></div>)}
        </>}
        {tab === "app" && <>
          {text("Latest app version", s.app.latestVersion, (v) => set("app", { ...s.app, latestVersion: v }))}
          {text("Minimum supported version", s.app.minVersion, (v) => set("app", { ...s.app, minVersion: v }))}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={s.app.forceUpdate} onChange={(e) => set("app", { ...s.app, forceUpdate: e.target.checked })} /> Force older apps to update</label>
          <p className="text-xs text-muted">The mobile app reads these from /api/v1/app/config.</p>
        </>}
        {tab === "store" && <div className="grid gap-3 sm:grid-cols-2">
          {(["name", "tagline", "founder", "phone", "whatsapp", "email", "address", "hours"] as const).map((k) => <div key={k}>{text(k[0].toUpperCase() + k.slice(1), s.store[k], (v) => set("store", { ...s.store, [k]: v }))}</div>)}
        </div>}
        <Alert error={a.error} msg={a.msg} />
        <div><button className="btn-primary" disabled={a.busy} onClick={save}>Save {TABS.find((t) => t[0] === tab)?.[1]}</button></div>
      </div>
    </div>
  );
}
