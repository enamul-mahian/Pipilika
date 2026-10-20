"use client";
import { useState } from "react";

export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j as T;
}

/** Hook for running an async action with loading + error message. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fn();
      if (success) setMsg(success);
      return r;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, msg, run, setError, setMsg };
}

export function Alert({ error, msg }: { error?: string | null; msg?: string | null }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (msg) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</p>;
  return null;
}

export function fileToDataUrl(file: File, maxDim = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error("Please choose a PNG, JPG or WEBP image"));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("Image too large (max 15 MB)"));
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}

export function ConfirmButton({ children, confirm, onConfirm, className = "btn-outline btn-sm", disabled }: { children: React.ReactNode; confirm: string; onConfirm: () => void; className?: string; disabled?: boolean }) {
  return (
    <button type="button" className={className} disabled={disabled} onClick={() => window.confirm(confirm) && onConfirm()}>
      {children}
    </button>
  );
}
