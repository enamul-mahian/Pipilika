import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { HeaderClient } from "./header-client";
import { db } from "@/lib/db";

export async function Header() {
  const s = await getSettings();
  const session = await getSession();
  const extra = await db.page.findMany({ where: { showInMenu: true, isPublished: true }, select: { slug: true, title: true } }).catch(() => []);
  const menu = [...s.header.menu, ...extra.filter((p) => !s.header.menu.some((m) => m.href === `/${p.slug}`)).map((p) => ({ label: p.title, href: `/${p.slug}` }))];
  return (
    <>
      {s.header.announcement && (
        <div className="bg-brand-deep px-4 py-1.5 text-center text-xs font-medium text-white/95">{s.header.announcement}</div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
        <div className="wrap flex items-center gap-4 py-2.5 lg:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${s.store.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.store.logo} alt="" width={48} height={48} className="h-11 w-11 rounded-full md:h-12 md:w-12" />
            <span className="leading-none">
              <b className="block font-display text-2xl font-normal text-brand md:text-[1.9rem]">{s.store.name}</b>
              <small className="text-[0.7rem] font-medium text-ink/80">{s.store.founder}</small>
            </span>
          </Link>
          <HeaderClient menu={menu} loggedIn={!!session} isStaff={session?.kind === "STAFF"} />
        </div>
      </header>
    </>
  );
}
