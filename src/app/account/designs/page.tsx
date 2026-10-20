import Link from "next/link";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tk, fmtDate, statusLabel } from "@/lib/format";

export default async function Designs() {
  const u = (await getUser())!;
  const designs = await db.customDesign.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, include: { order: { select: { id: true, code: true, status: true } } } });
  return (
    <div>
      <h1 className="text-3xl">Saved designs</h1>
      {designs.length === 0 ? <p className="mt-4 text-muted">No designs yet. <Link href="/custom-cake" className="text-brand underline">Design a cake</Link></p> : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {designs.map((d) => (
            <div key={d.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.previewKey ? <img src={`/api/v1/designs/${d.id}/file/preview`} alt="" className="aspect-square w-full bg-cream object-contain" /> : <div className="aspect-square bg-cream" />}
              <div className="p-3 text-sm">
                <p className="font-semibold">{d.title}</p>
                <p className="text-muted">{fmtDate(d.createdAt)} · est. {tk(d.estimatedPrice)}</p>
                {d.order ? <Link href={`/account/orders/${d.order.id}`} className="text-brand underline">{d.order.code} · {statusLabel(d.order.status)}</Link> : <span className="chip bg-blush text-brand">Draft</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
