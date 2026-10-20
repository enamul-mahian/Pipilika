import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { orderForView } from "@/lib/order-view";
import { OrderView } from "@/components/order-view";
import { ReviewForm, ReorderButton } from "@/components/account-tools";

export default async function MyOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = (await getUser())!;
  const o = await db.order.findFirst({ where: { id, userId: u.id } });
  if (!o?.shareToken) notFound();
  const [view, s, reviews] = await Promise.all([orderForView(o.id), getSettings(), db.review.findMany({ where: { orderId: o.id, userId: u.id } })]);
  const methods = Object.entries(s.payments.methods).filter(([k, m]) => m.enabled && k !== "COD").map(([k, m]) => ({ key: k, instructions: m.instructions }));
  const delivered = ["DELIVERED", "CLOSED"].includes(o.status);
  const reviewable = view.items.filter((i) => i.productId && !reviews.some((r) => r.productId === i.productId));
  return (
    <div className="grid gap-6">
      <OrderView order={view} token={o.shareToken} methods={methods} whatsapp={s.store.whatsapp} />
      {o.type === "STANDARD" && <ReorderButton items={view.items.filter((i) => i.productId).map((i) => ({ productId: i.productId!, name: i.name, qty: i.qty, image: i.image, unitPrice: i.unitPrice }))} />}
      {delivered && s.features.reviews && reviewable.map((i) => <ReviewForm key={i.id} orderId={o.id} productId={i.productId!} name={i.name} />)}
    </div>
  );
}
