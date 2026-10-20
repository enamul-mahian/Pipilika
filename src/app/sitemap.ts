import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const base = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://thepipilika.com").replace(/\/$/, "");
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = base();
  const [products, pages, cats] = await Promise.all([
    db.product.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }).catch(() => []),
    db.page.findMany({ where: { isPublished: true, noindex: false }, select: { slug: true, updatedAt: true } }).catch(() => []),
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }).catch(() => []),
  ]);
  return [
    ...["", "/shop", "/custom-cake", "/gallery", "/track"].map((p) => ({ url: u + p, changeFrequency: "daily" as const, priority: p ? 0.8 : 1 })),
    ...pages.filter((p) => p.slug !== "home").map((p) => ({ url: `${u}/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ...cats.map((c) => ({ url: `${u}/shop?category=${c.slug}`, priority: 0.7 })),
    ...products.map((p) => ({ url: `${u}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
  ];
}
