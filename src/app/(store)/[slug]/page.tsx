import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RenderBlocks } from "@/components/blocks";
import { loadPage } from "../cms";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const r = await loadPage(slug);
  if (!r) return {};
  return {
    title: r.page.seoTitle || r.page.title,
    description: r.page.seoDesc ?? undefined,
    alternates: { canonical: `/${slug}` },
    robots: r.page.noindex ? { index: false } : undefined,
    openGraph: r.page.ogImage ? { images: [r.page.ogImage] } : undefined,
  };
}

export default async function CmsPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await loadPage(slug, sp.preview === "1");
  if (!r || slug === "home") notFound();
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "/" }, { "@type": "ListItem", position: 2, name: r.page.title }] };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {r.isPreview && <div className="bg-gold py-2 text-center text-sm font-semibold">Preview of unpublished changes</div>}
      <div className="wrap pt-8"><nav className="text-sm text-muted"><a href="/" className="hover:text-brand">Home</a> / {r.page.title}</nav><h1 className="mt-2 text-4xl">{r.page.title}</h1></div>
      <RenderBlocks blocks={r.blocks} />
    </>
  );
}
