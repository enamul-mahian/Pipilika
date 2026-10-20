import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { NewsletterForm } from "./newsletter";

export async function Footer() {
  const s = await getSettings();
  const social = Object.entries(s.footer.social).filter(([, v]) => v);
  return (
    <footer className="mt-16 bg-cocoa text-white/85">
      <div className="wrap grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.store.logo} alt="" className="h-12 w-12 rounded-full" />
            <div>
              <b className="block font-display text-2xl font-normal text-brand-light">{s.store.name}</b>
              <small className="text-xs">{s.store.founder}</small>
            </div>
          </div>
          <p className="mt-4 font-script text-2xl text-gold">“{s.footer.quote}”</p>
          <p className="mt-2 text-sm text-white/70">{s.footer.about}</p>
          <p className="mt-3 text-sm">📞 {s.store.phone}<br />✉️ {s.store.email}<br />📍 {s.store.address}</p>
        </div>
        {s.footer.columns.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 font-body text-sm font-bold uppercase tracking-wider text-white">{c.title}</h3>
            <ul className="grid gap-2 text-sm">
              {c.links.map((l) => <li key={l.href + l.label}><Link href={l.href} className="hover:text-gold">{l.label}</Link></li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="mb-3 font-body text-sm font-bold uppercase tracking-wider text-white">Subscribe to our newsletter</h3>
          <NewsletterForm />
          {social.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              {social.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3 py-1 capitalize hover:border-gold hover:text-gold">{k}</a>)}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">{s.footer.copyright}</div>
    </footer>
  );
}
