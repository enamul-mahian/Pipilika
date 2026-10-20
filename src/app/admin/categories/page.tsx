import { db } from "@/lib/db";
import { Crud } from "@/components/crud";
export default async function Categories() {
  const rows = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return <div className="grid gap-4"><h1 className="text-3xl">Categories</h1><Crud resource="categories" title="Categories" rows={rows} fields={[{ key: "image", label: "Image", type: "image" }, { key: "name", label: "Name", required: true }, { key: "slug", label: "Slug", required: true, placeholder: "cakes" }, { key: "sortOrder", label: "Order", type: "number" }, { key: "isActive", label: "Active", type: "checkbox" }]} /></div>;
}
