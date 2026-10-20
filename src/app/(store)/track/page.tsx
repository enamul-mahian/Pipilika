import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
export const metadata: Metadata = { title: "Track your order" };

export default async function Track({ searchParams }: { searchParams: Promise<{ code?: string; phone?: string }> }) {
  const sp = await searchParams;
  let error = "";
  if (sp.code && sp.phone) {
    const phone = sp.phone.replace(/\D/g, "").replace(/^880/, "0");
    const o = await db.order.findFirst({ where: { code: sp.code.trim().toUpperCase(), phone } });
    if (o?.shareToken) redirect(`/o/${o.shareToken}`);
    error = "No order found with that code and phone number.";
  }
  return (
    <div className="wrap max-w-lg py-12">
      <h1 className="text-4xl">Track your order</h1>
      <p className="mt-2 text-muted">Enter your order code (e.g. PC-100281) and the phone number used at checkout.</p>
      <form className="card mt-6 grid gap-4 p-6">
        <div><label className="label" htmlFor="code">Order code</label><input id="code" name="code" required defaultValue={sp.code} className="input uppercase" placeholder="PC-100281" /></div>
        <div><label className="label" htmlFor="phone">Phone</label><input id="phone" name="phone" required defaultValue={sp.phone} className="input" placeholder="01XXXXXXXXX" inputMode="tel" /></div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary">Track order</button>
      </form>
    </div>
  );
}
