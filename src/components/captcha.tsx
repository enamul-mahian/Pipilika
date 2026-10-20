"use client";
import { useEffect, useRef } from "react";

declare global { interface Window { hcaptcha?: any } }

/** hCaptcha widget — renders only when a site key is configured. */
export function Captcha({ sitekey, onToken }: { sitekey: string; onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sitekey) return;
    const render = () => window.hcaptcha && ref.current && !ref.current.hasChildNodes() && window.hcaptcha.render(ref.current, { sitekey, callback: onToken });
    if (window.hcaptcha) return render();
    const s = document.createElement("script");
    s.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [sitekey, onToken]);
  if (!sitekey) return null;
  return <div ref={ref} className="my-2" />;
}
