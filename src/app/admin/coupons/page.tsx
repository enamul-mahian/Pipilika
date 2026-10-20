import { db } from "@/lib/db";
import { Crud } from "@/components/crud";
export default async function Coupons() {
  const [rows, zones, cats] = await Promise.all([db.coupon.findMany({ orderBy: { createdAt: "desc" } }), db.deliveryZone.findMany({ orderBy: { sort: "asc" } }), db.category.findMany()]);
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Coupons & delivery</h1>
      <Crud resource="coupons" title="Promo codes" rows={rows} fields={[
        { key: "code", label: "Code", required: true }, { key: "description", label: "Description", hideInTable: true },
        { key: "type", label: "Type", type: "select", options: [{ value: "PERCENT", label: "% off" }, { value: "FIXED", label: "Fixed ৳ off" }, { value: "FREE_DELIVERY", label: "Free delivery" }] },
        { key: "value", label: "Value", type: "number" }, { key: "maxDiscount", label: "Max discount", type: "number", hideInTable: true }, { key: "minOrder", label: "Min order", type: "number" },
        { key: "startsAt", label: "Starts", type: "date" }, { key: "endsAt", label: "Ends", type: "date" },
        { key: "usageLimit", label: "Total limit", type: "number" }, { key: "perUserLimit", label: "Per customer", type: "number" }, { key: "usedCount", label: "Used", type: "number", readOnly: true },
        { key: "categoryIds", label: "Category IDs (blank = all)", type: "tags", hideInTable: true, placeholder: cats.map((c) => `${c.name}: ${c.id}`).join(" | ") },
        { key: "productIds", label: "Product IDs (blank = all)", type: "tags", hideInTable: true },
        { key: "isActive", label: "Active", type: "checkbox" },
      ]} />
      <p className="-mt-4 text-xs text-muted">Category IDs: {cats.map((c) => `${c.name} = ${c.id}`).join(" · ")}</p>
      <Crud resource="zones" title="Delivery zones & charges" rows={zones} fields={[{ key: "name", label: "Area", required: true }, { key: "charge", label: "Charge (৳)", type: "number" }, { key: "sort", label: "Order", type: "number" }, { key: "isActive", label: "Active", type: "checkbox" }]} />
    </div>
  );
}
