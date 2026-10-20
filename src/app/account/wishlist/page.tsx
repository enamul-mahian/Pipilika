import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";

export default async function Wishlist() {
  const u = (await getUser())!;
  const items = await db.wishlist.findMany({ where: { userId: u.id }, include: { product: { include: { images: { take: 1 }, variants: true, modifiers: { select: { required: true } } } } } });
  return (
    <div>
      <h1 className="text-3xl">Wishlist</h1>
      {items.length === 0 ? <p className="mt-4 text-muted">Tap the heart on any product to save it here.</p> : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{items.map((w) => <ProductCard key={w.id} p={w.product} />)}</div>
      )}
    </div>
  );
}
