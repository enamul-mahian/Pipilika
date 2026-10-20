import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";
import { SearchTracker } from "@/components/trackers";

type SP = Promise<{ q?: string; category?: string; sort?: string; type?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = sp.category ? await db.category.findUnique({ where: { slug: sp.category } }) : null;
  return {
    title: sp.q ? `Search: ${sp.q}` : cat ? `${cat.name} — order online in Dhaka` : "Shop cakes, pastries & more",
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
    robots: sp.q ? { index: false } : undefined,
  };
}

export default async function Shop({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const cats = await db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const where: any = { isActive: true, deletedAt: null };
  if (sp.category) where.category = { slug: sp.category };
  if (sp.type === "custom") where.type = "CUSTOM";
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }, { tags: { has: sp.q.toLowerCase() } }];
  const orderBy =
    sp.sort === "price_asc" ? { basePrice: "asc" as const } : sp.sort === "price_desc" ? { basePrice: "desc" as const } : sp.sort === "popular" ? { soldCount: "desc" as const } : sp.sort === "rating" ? { ratingAvg: "desc" as const } : { createdAt: "desc" as const };
  const products = await db.product.findMany({ where, orderBy, include: { images: { orderBy: { sort: "asc" }, take: 1 }, variants: true, modifiers: { select: { required: true } } } });
  const current = cats.find((c) => c.slug === sp.category);
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { q: sp.q, category: sp.category, sort: sp.sort, ...o };
    Object.entries(m).forEach(([k, v]) => v && p.set(k, v));
    return `/shop${p.size ? "?" + p : ""}`;
  };
  return (
    <div className="wrap py-8">
      {sp.q && <SearchTracker q={sp.q} />}
      <nav className="text-sm text-muted"><Link href="/" className="hover:text-brand">Home</Link> / Shop{current ? ` / ${current.name}` : ""}</nav>
      <h1 className="mt-2 text-4xl">{sp.q ? `Results for “${sp.q}”` : current?.name ?? "All products"}</h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={qs({ category: undefined })} className={`tab border border-line ${!sp.category ? "tab-on" : ""}`}>All</Link>
        {cats.map((c) => <Link key={c.id} href={qs({ category: c.slug })} className={`tab border border-line ${sp.category === c.slug ? "tab-on" : ""}`}>{c.name}</Link>)}
        <form className="ml-auto flex items-center gap-2" action="/shop">
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <label htmlFor="sort" className="text-sm text-muted">Sort</label>
          <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="input !w-auto !py-1.5 text-sm">
            <option value="">Newest</option><option value="popular">Best selling</option><option value="rating">Top rated</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
          </select>
          <button className="btn-outline btn-sm">Apply</button>
        </form>
      </div>
      {products.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold">No products found</p>
          <p className="text-muted">Try another search, or design your own cake.</p>
          <Link href="/custom-cake" className="btn-primary mt-4">Design a custom cake</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
