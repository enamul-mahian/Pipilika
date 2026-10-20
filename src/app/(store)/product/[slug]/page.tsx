import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { tk, fmtDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { ProductOptions } from "@/components/product-options";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { ViewTracker } from "@/components/trackers";
import { WishlistButton } from "@/components/wishlist-button";

type P = { params: Promise<{ slug: string }> };
const load = (slug: string) =>
  db.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      images: { orderBy: { sort: "asc" } }, variants: { orderBy: { sort: "asc" } }, category: true,
      modifiers: { orderBy: { sort: "asc" }, include: { options: { orderBy: { sort: "asc" } } } },
      reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return {};
  return {
    title: p.seoTitle || p.name,
    description: p.seoDesc || p.description.slice(0, 160),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { images: p.images.slice(0, 1).map((i) => i.url), type: "website" },
  };
}

export default async function ProductPage({ params }: P) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const s = await getSettings();
  const related = await db.product.findMany({
    where: { categoryId: p.categoryId, id: { not: p.id }, isActive: true, deletedAt: null }, take: 4,
    include: { images: { orderBy: { sort: "asc" }, take: 1 }, variants: true, modifiers: { select: { required: true } } },
  });
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.basePrice;
  const ld = [
    {
      "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, image: p.images.map((i) => site + i.url), sku: p.id,
      brand: { "@type": "Brand", name: "Pipilika" },
      offers: { "@type": "AggregateOffer", priceCurrency: "BDT", lowPrice: minPrice, highPrice: Math.max(minPrice, ...p.variants.map((v) => v.price)), availability: p.stock === 0 && !p.madeToOrder ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
      ...(p.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } } : {}),
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: site + "/" }, { "@type": "ListItem", position: 2, name: p.category?.name ?? "Shop", item: site + "/shop" + (p.category ? `?category=${p.category.slug}` : "") }, { "@type": "ListItem", position: 3, name: p.name }] },
  ];
  return (
    <div className="wrap py-8">
      <ViewTracker id={p.id} name={p.name} price={minPrice} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">Home</Link> / <Link href={p.category ? `/shop?category=${p.category.slug}` : "/shop"} className="hover:text-brand">{p.category?.name ?? "Shop"}</Link> / {p.name}
      </nav>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <ProductGallery images={p.images.map((i) => ({ url: i.url, alt: i.alt ?? p.name }))} />
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl md:text-4xl">{p.name}</h1>
            {s.features.wishlist && <WishlistButton productId={p.id} />}
          </div>
          {p.ratingCount > 0 && <p className="mt-1 text-sm text-muted"><span className="text-gold">★</span> {p.ratingAvg.toFixed(1)} · {p.ratingCount} reviews · {p.soldCount} sold</p>}
          <p className="mt-2 text-sm">
            {p.madeToOrder ? <span className="chip bg-blush text-brand">Made to order</span> : p.stock == null ? <span className="chip bg-green-100 text-green-800">Available</span> : p.stock > 0 ? <span className="chip bg-green-100 text-green-800">In stock ({p.stock})</span> : <span className="chip bg-red-100 text-red-700">Sold out</span>}
          </p>
          <p className="mt-4 whitespace-pre-line text-ink/85">{p.description}</p>
          <ProductOptions
            product={{ id: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, basePrice: p.basePrice, minQty: p.minQty, soldOut: p.stock != null && p.stock <= 0 && !p.madeToOrder, variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price })), modifiers: p.modifiers as any }}
          />
          {p.type === "CUSTOM" && (
            <p className="mt-4 rounded-xl bg-blush p-3 text-sm">Want your own design on this? <Link href="/custom-cake" className="font-bold text-brand">Open the Custom Cake Designer →</Link></p>
          )}
        </div>
      </div>

      {s.features.reviews && (
        <section className="mt-12">
          <h2 className="section-title">Reviews</h2>
          {p.reviews.length === 0 ? <p className="mt-2 text-muted">No reviews yet. Bought this? Review it from your account after delivery.</p> : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {p.reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <p className="flex items-center justify-between text-sm"><b>{r.name} {r.isVerified && <span className="chip ml-1 bg-green-100 text-green-800">Verified order</span>}</b><span className="text-muted">{fmtDate(r.createdAt)}</span></p>
                  <p className="text-gold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p>
                  <p className="mt-1">{r.comment}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.photoUrl && <img src={r.photoUrl} alt="Customer photo" className="mt-2 h-24 rounded-lg object-cover" />}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title mb-4">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
      <p className="sr-only">Price from {tk(minPrice)}</p>
    </div>
  );
}
