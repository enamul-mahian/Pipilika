import { db } from "@/lib/db";
import { Crud } from "@/components/crud";
import { PriceMatrix } from "@/components/admin-misc";
export default async function CakeBuilder() {
  const [bases, weights, prices, options] = await Promise.all([db.cakeBase.findMany({ orderBy: { sort: "asc" } }), db.cakeWeight.findMany({ orderBy: { grams: "asc" } }), db.cakeBasePrice.findMany(), db.cakeOption.findMany({ orderBy: [{ kind: "asc" }, { sort: "asc" }] })]);
  return (
    <div className="grid gap-6">
      <div><h1 className="text-3xl">Cake builder pricing</h1><p className="text-sm text-muted">Final price = base/weight + filling + decoration + print + board + extras + shape surcharge + delivery − discount. Everything here is editable; nothing is hard-coded.</p></div>
      <PriceMatrix bases={bases} weights={weights} prices={prices} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Crud resource="cake-bases" title="Cake bases / flavours" rows={bases} fields={[{ key: "name", label: "Name", required: true }, { key: "sort", label: "Order", type: "number" }, { key: "isActive", label: "Active", type: "checkbox" }]} />
        <Crud resource="cake-weights" title="Weights" rows={weights} fields={[{ key: "grams", label: "Grams", type: "number", required: true }, { key: "label", label: "Label", required: true }, { key: "sort", label: "Order", type: "number" }]} />
      </div>
      <Crud resource="cake-options" title="Options: fillings, decorations, prints, boards, extras, shape surcharges" rows={options} fields={[
        { key: "kind", label: "Kind", type: "select", options: ["FILLING", "DECORATION", "PRINT", "BOARD", "EXTRA", "SHAPE"].map((v) => ({ value: v, label: v })) },
        { key: "name", label: "Name", required: true }, { key: "price", label: "Price (৳)", type: "number" },
        { key: "meta", label: "Settings (JSON)", type: "json", placeholder: '{"perKg":true}  ·  prints: {"printType":"SUGAR"}  ·  shapes: {"category":"number"}' },
        { key: "sort", label: "Order", type: "number" }, { key: "isActive", label: "Active", type: "checkbox" },
      ]} />
    </div>
  );
}
