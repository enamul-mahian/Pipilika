import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BLOCK_TYPES, type Block } from "@/components/blocks";
import { PageEditor } from "@/components/admin-site";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, cats] = await Promise.all([db.page.findUnique({ where: { id } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  if (!p) notFound();
  return (
    <PageEditor
      page={{ id: p.id, slug: p.slug, title: p.title, isPublished: p.isPublished, isSystem: p.isSystem, showInMenu: p.showInMenu, seoTitle: p.seoTitle ?? "", seoDesc: p.seoDesc ?? "", ogImage: p.ogImage ?? "", noindex: p.noindex, blocks: (p.blocks as Block[]) ?? [] }}
      types={Object.fromEntries(Object.entries(BLOCK_TYPES).map(([k, v]) => [k, v]))}
      categories={cats.map((c) => c.slug)}
    />
  );
}
