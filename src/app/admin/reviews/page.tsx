import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { ReviewToggle } from "@/components/admin-misc";
export default async function Reviews() {
  const rows = await db.review.findMany({ orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } } }, take: 200 });
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Reviews</h1>
      <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Date</th><th>Product</th><th>Customer</th><th>Rating</th><th>Comment</th><th>Visible</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{fmtDate(r.createdAt)}</td><td>{r.product.name}</td><td>{r.name} {r.isVerified && <span className="chip bg-green-100 text-green-800">Verified</span>}</td><td className="text-gold">{"★".repeat(r.rating)}</td><td className="max-w-md">{r.comment}{r.photoUrl && <a href={r.photoUrl} target="_blank" className="ml-1 text-brand underline">photo</a>}</td><td><ReviewToggle id={r.id} on={r.isApproved} /></td></tr>)}</tbody></table></div>
    </div>
  );
}
