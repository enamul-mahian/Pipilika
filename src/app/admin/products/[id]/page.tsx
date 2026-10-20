import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductEditor } from "@/components/admin-product-editor";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const p = id === "new" ? null : await db.product.findFirst({ where: { id, deletedAt: null }, include: { images: { orderBy: { sort: "asc" } }, variants: { orderBy: { sort: "asc" } }, modifiers: { orderBy: { sort: "asc" }, include: { options: { orderBy: { sort: "asc" } } } } } });
  if (id !== "new" && !p) notFound();
  return <ProductEditor categories={cats.map((c) => ({ id: c.id, name: c.name }))} product={p as any} />;
}
