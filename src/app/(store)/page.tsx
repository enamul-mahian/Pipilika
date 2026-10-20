import { notFound } from "next/navigation";
import { RenderBlocks } from "@/components/blocks";
import { loadPage } from "./cms";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const r = await loadPage("home");
  return r?.page.seoTitle ? { title: { absolute: r.page.seoTitle }, description: r.page.seoDesc ?? undefined, alternates: { canonical: "/" } } : { alternates: { canonical: "/" } };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const sp = await searchParams;
  const r = await loadPage("home", sp.preview === "1");
  if (!r) notFound();
  return (
    <>
      {r.isPreview && <div className="bg-gold py-2 text-center text-sm font-semibold">Preview of unpublished changes</div>}
      <RenderBlocks blocks={r.blocks} />
    </>
  );
}
