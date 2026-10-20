import Link from "next/link";
import { db } from "@/lib/db";
import { tk } from "@/lib/format";

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q;
  const items = await db.product.findMany({ where: { deletedAt: null, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) }, orderBy: { createdAt: "desc" }, include: { images: { take: 1, orderBy: { sort: "asc" } }, category: true, variants: true, _count: { select: { modifiers: true } } } });
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Products</h1><Link href="/admin/products/new" className="btn-primary">+ Add product</Link></div>
      <form><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search products…" aria-label="Search" /></form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th /><th>Name</th><th>Category</th><th>Type</th><th className="text-right">Price</th><th>Stock</th><th>Sold</th><th>Status</th></tr></thead>
          <tbody>{items.map((p) => (
            <tr key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <td><img src={p.images[0]?.url ?? "/demo/pastries.jpg"} alt="" className="h-11 w-11 rounded-lg object-cover" /></td>
              <td><Link href={`/admin/products/${p.id}`} className="font-semibold text-brand">{p.name}</Link><br /><span className="text-xs text-muted">{p.variants.length} sizes · {p._count.modifiers} option groups</span></td>
              <td>{p.category?.name ?? "—"}</td>
              <td>{p.type === "CUSTOM" ? "Custom / variable" : "Fixed"}</td>
              <td className="text-right">{p.variants.length ? `${tk(Math.min(...p.variants.map((v) => v.price)))}+` : tk(p.basePrice)}</td>
              <td>{p.madeToOrder ? "Made to order" : p.stock == null ? "∞" : <span className={p.stock <= 5 ? "font-bold text-red-700" : ""}>{p.stock}</span>}</td>
              <td>{p.soldCount}</td>
              <td>{p.isActive ? <span className="chip bg-green-100 text-green-800">Active</span> : <span className="chip bg-line text-muted">Hidden</span>} {p.isFeatured && <span className="chip bg-gold/30">Featured</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
