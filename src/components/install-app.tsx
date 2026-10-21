"use client";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "pp-install-dismissed";

/** Registers the service worker and offers "Install app": the browser prompt on Android/desktop, Share → Add to Home Screen steps on iPhone. */
export function InstallApp() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/pos")) return;
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(KEY); } catch {}
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (dismissed || standalone) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) setIos(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => { setEvt(null); setIos(false); try { localStorage.setItem(KEY, "1"); } catch {} };
  if (!evt && !ios) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card md:bottom-6" role="dialog" aria-label="Install app">
      <img src="/brand/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Install Pipilika app</p>
        {ios ? (
          <p className="text-muted">Tap <b>Share</b> (□↑) then <b>Add to Home Screen</b>.</p>
        ) : (
          <p className="text-muted">Order faster from your home screen.</p>
        )}
      </div>
      {evt && (
        <button className="btn-primary btn-sm" onClick={async () => { await evt.prompt(); await evt.userChoice; close(); }}>Install</button>
      )}
      <button className="btn-ghost btn-sm" aria-label="Close" onClick={close}>✕</button>
    </div>
  );
}
