"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart";
import { IconCart, IconMenu, IconSearch, IconUser, IconX } from "./icons";
import type { NavLink } from "@/lib/settings";

export function HeaderClient({ menu, loggedIn, isStaff }: { menu: NavLink[]; loggedIn: boolean; isStaff: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const isOn = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.split("?")[0]) && href !== "/");
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  };
  return (
    <>
      <nav className="mx-auto hidden gap-6 lg:flex" aria-label="Main">
        {menu.map((m) => (
          <Link key={m.href + m.label} href={m.href} className={`border-b-2 py-1.5 font-medium transition ${isOn(m.href) ? "border-brand text-brand" : "border-transparent hover:text-brand"}`}>
            {m.label}
          </Link>
        ))}
      </nav>
      <form onSubmit={search} className="ml-auto hidden max-w-[260px] flex-1 items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 md:flex lg:ml-0" role="search">
        <IconSearch className="h-4 w-4 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cakes, pastries…" aria-label="Search" className="w-full bg-transparent text-sm outline-none" />
      </form>
      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <Link href={isStaff ? "/admin" : loggedIn ? "/account" : "/login"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush" aria-label="Account">
          <IconUser className="h-6 w-6" />
        </Link>
        <Link href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-blush" aria-label={`Cart, ${count} items`}>
          <IconCart className="h-6 w-6" />
          {ready && count > 0 && <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[0.65rem] font-bold text-white">{count}</span>}
        </Link>
        <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-blush lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <IconX className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-line bg-cream px-4 pb-4 shadow-lg lg:hidden">
          <form onSubmit={search} className="my-3 flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2">
            <IconSearch className="h-4 w-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full bg-transparent outline-none" />
          </form>
          <nav className="grid gap-1" aria-label="Mobile">
            {menu.map((m) => (
              <Link key={m.href + m.label} href={m.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2.5 font-medium ${isOn(m.href) ? "bg-blush text-brand" : ""}`}>
                {m.label}
              </Link>
            ))}
            <Link href="/track" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-medium">Track order</Link>
          </nav>
        </div>
      )}
    </>
  );
}
