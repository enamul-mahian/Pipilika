import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { tk, fmtDate } from "@/lib/format";
import { ProductCard } from "./product-card";
import { IconCrown, IconHeart, IconTruck, IconStar, IconCheck } from "./icons";

export type Block = { id: string; type: string; props: Record<string, any> };

export const BLOCK_TYPES: Record<string, { label: string; defaults: Record<string, any> }> = {
  hero: { label: "Hero banner", defaults: { eyebrow: "Freshly baked · Premium ingredients · Made with love", title: "Custom Cakes for Every", highlight: "Special Moment", subtitle: "Birthdays, anniversaries, weddings or just because.", image: "/demo/hero.jpg", primaryLabel: "Order Custom Cake", primaryHref: "/custom-cake", secondaryLabel: "Browse Products", secondaryHref: "/shop", features: "Home delivery across Bangladesh\nPremium quality ingredients\n100% customizable designs\nFreshly baked with love" } },
  products: { label: "Product row", defaults: { title: "Featured Products", subtitle: "Freshly baked delights for every celebration", source: "featured", category: "", limit: 8 } },
  categories: { label: "Category grid", defaults: { title: "Shop by category" } },
  customCake: { label: "Custom cake promo", defaults: { title: "Design your dream cake", text: "Upload a photo (optional), pick a shape, flavour and size, add your message and see a live preview with instant price.", image: "/demo/cake-ayan.jpg", cta: "Start designing" } },
  gallery: { label: "Gallery strip", defaults: { title: "Previous designs", limit: 6 } },
  features: { label: "Features bar", defaults: { items: "Custom cakes|for every occasion\nWide range|of baked goodies\nFast & safe|delivery across BD\nPremium quality|ingredients\nLoved by|thousands of customers" } },
  text: { label: "Text section", defaults: { title: "About Pipilika", body: "Write something here." } },
  image: { label: "Image banner", defaults: { image: "/demo/hero-banner.jpg", title: "", text: "", href: "" } },
  faq: { label: "FAQ", defaults: { title: "Frequently asked questions", items: "How early should I order a custom cake?|At least 48 hours before for most designs, 5 days for tiered/wedding cakes." } },
  testimonials: { label: "Customer reviews", defaults: { title: "What our customers say", limit: 3 } },
  contact: { label: "Contact info", defaults: { title: "Get in touch", text: "Call, WhatsApp or visit us." } },
  offers: { label: "Active offers", defaults: { title: "Current offers" } },
};

const lines = (s: string = "") => s.split("\n").map((l) => l.trim()).filter(Boolean);

async function productsFor(props: Record<string, any>) {
  const limit = Math.min(24, Number(props.limit) || 8);
  const where: any = { isActive: true, deletedAt: null };
  if (props.source === "featured") where.isFeatured = true;
  if (props.source === "category" && props.category) where.category = { slug: props.category };
  const orderBy = props.source === "best" ? { soldCount: "desc" as const } : { createdAt: "desc" as const };
  return db.product.findMany({ where, orderBy, take: limit, include: { images: { orderBy: { sort: "asc" }, take: 1 }, variants: true, modifiers: { select: { required: true } } } });
}

export async function RenderBlock({ b }: { b: Block }) {
  const p = b.props ?? {};
  switch (b.type) {
    case "hero": {
      const feats = lines(p.features);
      const icons = [IconTruck, IconStar, IconHeart, IconCrown];
      return (
        <section className="relative overflow-hidden bg-brand-deep text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover object-right opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-deep via-brand/90 to-transparent md:via-brand/80 md:to-transparent" />
          <div className="wrap relative py-12 md:py-20">
            {p.eyebrow && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/85 md:text-xs">{p.eyebrow}</p>}
            <h1 className="mt-3 max-w-xl text-4xl leading-[1.05] md:text-6xl">
              {p.title} <span className="block text-gold">{p.highlight}</span>
            </h1>
            {p.subtitle && <p className="mt-4 max-w-md text-white/90 md:text-lg">{p.subtitle}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {p.primaryLabel && <Link href={p.primaryHref || "/"} className="btn border border-gold/70 bg-brand text-white hover:bg-brand-deep">{p.primaryLabel} →</Link>}
              {p.secondaryLabel && <Link href={p.secondaryHref || "/"} className="btn border border-white text-white hover:bg-white/10">{p.secondaryLabel}</Link>}
            </div>
            {feats.length > 0 && (
              <ul className="mt-8 grid max-w-2xl grid-cols-2 gap-3 text-xs md:flex md:gap-6 md:text-sm">
                {feats.map((f, i) => {
                  const I = icons[i % icons.length];
                  return <li key={f} className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/60"><I className="h-4 w-4" /></span>{f}</li>;
                })}
              </ul>
            )}
          </div>
        </section>
      );
    }
    case "products": {
      const items = await productsFor(p);
      if (!items.length) return null;
      return (
        <section className="wrap py-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">{p.title}</h2>
              {p.subtitle && <p className="text-muted">{p.subtitle}</p>}
            </div>
            <Link href={p.source === "category" && p.category ? `/shop?category=${p.category}` : "/shop"} className="shrink-0 font-bold text-brand">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-4">
            {items.map((x) => <ProductCard key={x.id} p={x} />)}
          </div>
        </section>
      );
    }
    case "categories": {
      const cats = await db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
      return (
        <section className="wrap py-10">
          <h2 className="section-title mb-5">{p.title}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {cats.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="group text-center">
                <span className="mx-auto block aspect-square w-full max-w-[120px] overflow-hidden rounded-full border-4 border-white bg-blush shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-110" />}
                </span>
                <span className="mt-2 block text-sm font-semibold group-hover:text-brand">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    }
    case "customCake":
      return (
        <section className="wrap py-10">
          <div className="grid items-center gap-6 overflow-hidden rounded-3xl bg-blush p-6 md:grid-cols-2 md:p-10">
            <div>
              <p className="font-script text-2xl text-brand">Custom Cake Designer</p>
              <h2 className="section-title mt-1">{p.title}</h2>
              <p className="mt-3 text-muted">{p.text}</p>
              <ol className="mt-4 grid gap-1.5 text-sm">
                {["Upload image (optional) or pick a design", "Choose shape, flavour & weight", "Add your message & see live price", "Submit — we confirm & send a quote"].map((s, i) => (
                  <li key={s} className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>{s}</li>
                ))}
              </ol>
              <Link href="/custom-cake" className="btn-primary mt-6">{p.cta} →</Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="Custom cake example" loading="lazy" className="w-full rounded-2xl object-cover shadow-card" />
          </div>
        </section>
      );
    case "gallery": {
      const items = await db.galleryItem.findMany({ where: { isPublished: true }, orderBy: { sort: "asc" }, take: Number(p.limit) || 6 });
      if (!items.length) return null;
      return (
        <section className="wrap py-10">
          <div className="mb-5 flex items-end justify-between"><h2 className="section-title">{p.title}</h2><Link href="/gallery" className="font-bold text-brand">See gallery →</Link></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {items.map((g) => (
              <Link key={g.id} href={`/custom-cake?gallery=${g.id}`} className="group relative aspect-square overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image} alt={g.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-2 text-xs font-semibold text-white">{g.title}<br /><span className="text-gold">Order similar →</span></span>
              </Link>
            ))}
          </div>
        </section>
      );
    }
    case "features": {
      const items = lines(p.items).map((l) => l.split("|"));
      const icons = [IconCrown, IconStar, IconTruck, IconCheck, IconHeart];
      return (
        <section className="wrap py-6">
          <ul className="grid grid-cols-2 gap-4 rounded-2xl bg-blush p-5 md:grid-cols-5">
            {items.map(([a, b2], i) => {
              const I = icons[i % icons.length];
              return <li key={a} className="flex items-center gap-3 text-sm"><I className="h-6 w-6 shrink-0 text-brand" /><span><b className="block">{a}</b>{b2}</span></li>;
            })}
          </ul>
        </section>
      );
    }
    case "text":
      return (
        <section className="wrap max-w-3xl py-10">
          {p.title && <h2 className="section-title mb-4">{p.title}</h2>}
          <div className="grid gap-3 leading-relaxed text-ink/90">{String(p.body ?? "").split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}</div>
        </section>
      );
    case "image": {
      const inner = (
        <div className="relative overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.title || ""} loading="lazy" className="h-56 w-full object-cover md:h-72" />
          {(p.title || p.text) && <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 p-6 text-white"><h2 className="text-3xl">{p.title}</h2><p>{p.text}</p></div>}
        </div>
      );
      return <section className="wrap py-8">{p.href ? <Link href={p.href}>{inner}</Link> : inner}</section>;
    }
    case "faq": {
      const items = lines(p.items).map((l) => l.split("|"));
      const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
      return (
        <section className="wrap max-w-3xl py-10">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
          <h2 className="section-title mb-4">{p.title}</h2>
          <div className="grid gap-2">
            {items.map(([q, a]) => (
              <details key={q} className="card group p-4">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">{q}<span className="float-right text-brand group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      );
    }
    case "testimonials": {
      const reviews = await db.review.findMany({ where: { isApproved: true, rating: { gte: 4 } }, orderBy: { createdAt: "desc" }, take: Number(p.limit) || 3, include: { product: { select: { name: true } } } });
      if (!reviews.length) return null;
      return (
        <section className="wrap py-10">
          <h2 className="section-title mb-5">{p.title}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-5">
                <p className="text-gold">{"★".repeat(r.rating)}</p>
                <blockquote className="mt-2">“{r.comment}”</blockquote>
                <figcaption className="mt-3 text-sm text-muted">— {r.name}, on {r.product.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
    }
    case "contact": {
      const s = await getSettings();
      return (
        <section className="wrap py-10">
          <h2 className="section-title">{p.title}</h2>
          <p className="mt-2 text-muted">{p.text}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <a href={`tel:${s.store.phone}`} className="card p-5"><b className="block">Phone</b>{s.store.phone}</a>
            <a href={`https://wa.me/${s.store.whatsapp}`} target="_blank" rel="noopener noreferrer" className="card p-5"><b className="block">WhatsApp</b>Chat with us</a>
            <div className="card p-5"><b className="block">Visit</b>{s.store.address}<br /><span className="text-sm text-muted">{s.store.hours}</span></div>
          </div>
        </section>
      );
    }
    case "offers": {
      const now = new Date();
      const coupons = await db.coupon.findMany({ where: { isActive: true, OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, orderBy: { createdAt: "desc" } });
      const visible = coupons.filter((c) => (!c.startsAt || c.startsAt <= now) && (c.usageLimit == null || c.usedCount < c.usageLimit));
      return (
        <section className="wrap py-10">
          <h2 className="section-title mb-5">{p.title}</h2>
          {!visible.length && <p className="text-muted">No offers right now — check back soon!</p>}
          <div className="grid gap-4 md:grid-cols-3">
            {visible.map((c) => (
              <div key={c.id} className="card border-dashed border-brand p-5">
                <p className="font-display text-3xl text-brand">{c.type === "PERCENT" ? `${c.value}% OFF` : c.type === "FIXED" ? `${tk(c.value)} OFF` : "FREE DELIVERY"}</p>
                <p className="mt-1 text-sm">{c.description}</p>
                <p className="mt-3 inline-block rounded-lg bg-blush px-3 py-1 font-mono font-bold tracking-wider">{c.code}</p>
                <p className="mt-2 text-xs text-muted">{c.minOrder ? `Min order ${tk(c.minOrder)} · ` : ""}{c.endsAt ? `Valid till ${fmtDate(c.endsAt)}` : "No expiry"}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

export async function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b) => <RenderBlock key={b.id} b={b} />)}</>;
}
