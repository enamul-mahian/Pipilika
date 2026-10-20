"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Nav({ items }: { items: { href: string; label: string; badge: number }[] }) {
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const full = path + (sp.toString() ? "?" + sp.toString() : "");
  const active = (h: string) => (h === "/admin" ? path === "/admin" : h.includes("?") ? full.startsWith(h) : path.startsWith(h) && !(h === "/admin/orders" && sp.get("type")));
  return (
    <>
      <button className="mx-3 mb-2 rounded-lg border border-white/20 px-3 py-2 text-sm lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>☰ Menu</button>
      <nav className={`${open ? "grid" : "hidden"} gap-0.5 px-3 pb-3 text-sm lg:grid`} aria-label="Admin">
        {items.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2 ${active(i.href) ? "bg-brand text-white" : "hover:bg-white/10"}`}>
            {i.label}{i.badge > 0 && <span className="chip bg-gold text-ink">{i.badge}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
export function AdminNav(p: { items: { href: string; label: string; badge: number }[] }) {
  return <Suspense><Nav {...p} /></Suspense>;
}
