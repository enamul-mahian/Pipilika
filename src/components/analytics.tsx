"use client";
import { useEffect, useState } from "react";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void }
}

const FB_MAP: Record<string, string> = {
  view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", search: "Search",
};

/** Fire an analytics event to GA4 / GTM / Meta Pixel (whichever is loaded) + our own DB log. */
export function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer?.push({ event: name, ...params });
    window.gtag?.("event", name, params);
    if (window.fbq) FB_MAP[name] ? window.fbq("track", FB_MAP[name], params) : window.fbq("trackCustom", name, params);
    const src = sessionStorage.getItem("pp_src") || undefined;
    navigator.sendBeacon?.("/api/v1/track", JSON.stringify({ name, source: src, data: params }));
  } catch {}
}

function inject(id: string, code: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.innerHTML = code;
  document.head.appendChild(s);
}
function injectSrc(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function Analytics({ ga4, gtm, pixel, requireConsent }: { ga4: string; gtm: string; pixel: string; requireConsent: boolean }) {
  const [consent, setConsent] = useState<string | null>("unknown");
  useEffect(() => {
    try {
      setConsent(localStorage.getItem("pp_consent"));
      const p = new URLSearchParams(location.search);
      const src = p.get("utm_source") || p.get("ref") || p.get("fbclid") && "facebook" || p.get("gclid") && "google";
      if (src) sessionStorage.setItem("pp_src", src);
    } catch {
      setConsent(null);
    }
  }, []);
  const allowed = !requireConsent || consent === "yes";
  useEffect(() => {
    if (!allowed) return;
    if (ga4) {
      injectSrc("ga4-src", `https://www.googletagmanager.com/gtag/js?id=${ga4}`);
      inject("ga4", `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4}');`);
    }
    if (gtm) inject("gtm", `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`);
    if (pixel) inject("fbpixel", `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`);
  }, [allowed, ga4, gtm, pixel]);

  if (!requireConsent || consent !== null || !(ga4 || gtm || pixel)) return null;
  const choose = (v: string) => {
    try { localStorage.setItem("pp_consent", v); } catch {}
    setConsent(v);
  };
  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-line bg-white p-4 shadow-lg md:inset-x-auto md:left-4">
      <p className="text-sm">We use cookies for analytics and ads to improve your experience. You can change this anytime.</p>
      <div className="mt-3 flex gap-2">
        <button className="btn-primary btn-sm" onClick={() => choose("yes")}>Accept</button>
        <button className="btn-outline btn-sm" onClick={() => choose("no")}>Only necessary</button>
      </div>
    </div>
  );
}
