import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrderView } from "@/components/order-view";
import { orderForView } from "@/lib/order-view";
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderByToken({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const o = await db.order.findUnique({ where: { shareToken: token } });
  if (!o) notFound();
  const s = await getSettings();
  const view = await orderForView(o.id);
  const methods = Object.entries(s.payments.methods).filter(([k, m]) => m.enabled && k !== "COD").map(([k, m]) => ({ key: k, instructions: m.instructions }));
  return <div className="wrap max-w-4xl py-8"><OrderView order={view} token={token} methods={methods} whatsapp={s.store.whatsapp} isNew={!!sp.new} /></div>;
}
