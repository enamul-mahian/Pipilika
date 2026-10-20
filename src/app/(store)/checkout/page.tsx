import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Checkout } from "@/components/checkout";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export default async function CheckoutPage() {
  const [zones, user, s] = await Promise.all([
    db.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sort: "asc" } }),
    getUser(),
    getSettings(),
  ]);
  const addr = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : null;
  const methods = Object.entries(s.payments.methods).filter(([, m]) => m.enabled).map(([k, m]) => ({ key: k, instructions: m.instructions }));
  return (
    <div className="wrap py-8">
      <h1 className="text-4xl">Checkout</h1>
      <Checkout
        zones={zones.map((z) => ({ id: z.id, name: z.name, charge: z.charge }))}
        methods={methods}
        user={user ? { name: user.name, phone: user.phone ?? addr?.phone ?? "", email: user.email ?? "", address: addr ? `${addr.line}${addr.area ? ", " + addr.area : ""}, ${addr.city}` : "" } : null}
      />
    </div>
  );
}
