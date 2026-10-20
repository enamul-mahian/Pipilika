import { db } from "@/lib/db";
import { Crud } from "@/components/crud";
export default async function Gallery() {
  const rows = await db.galleryItem.findMany({ orderBy: { sort: "asc" } });
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Gallery / previous designs</h1>
      <p className="text-sm text-muted">Each item shows on /gallery with “Order similar design”, which opens the cake designer pre-filled. Tip: publish a finished custom order from its order page.</p>
      <Crud resource="gallery" title="Gallery items" rows={rows} fields={[{ key: "image", label: "Image", type: "image" }, { key: "title", label: "Title", required: true }, { key: "description", label: "Description", hideInTable: true }, { key: "minWeightG", label: "Min weight (g)", type: "number" }, { key: "startPrice", label: "From price", type: "number" }, { key: "tags", label: "Tags", type: "tags", hideInTable: true }, { key: "sort", label: "Order", type: "number" }, { key: "isPublished", label: "Published", type: "checkbox" }]} />
    </div>
  );
}
