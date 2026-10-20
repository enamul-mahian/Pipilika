import { db } from "@/lib/db";
import { fmtDate, tk } from "@/lib/format";
import { Crud } from "@/components/crud";
import { ApiForm } from "@/components/admin-forms";

export default async function Inventory() {
  const [items, moves] = await Promise.all([
    db.inventoryItem.findMany({ orderBy: { name: "asc" } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { item: true } }),
  ]);
  const value = items.reduce((a, i) => a + i.stock * i.costPerUnit, 0);
  const low = items.filter((i) => i.isActive && i.stock <= i.reorderLevel);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-3xl">Inventory</h1><p className="text-sm text-muted">Stock value <b className="text-ink">{tk(Math.round(value))}</b> · {low.length} low</p></div>
      {low.length > 0 && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-800"><b>Low stock:</b> {low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(", ")}</div>}
      <div className="card overflow-x-auto">
        <table className="table"><thead><tr><th>Item</th><th className="text-right">Stock</th><th className="text-right">Reorder at</th><th className="text-right">Cost / unit</th><th className="text-right">Value</th></tr></thead><tbody>
          {items.map((i) => <tr key={i.id} className={i.stock <= i.reorderLevel ? "bg-red-50" : ""}><td className="font-semibold">{i.name}</td><td className="text-right">{i.stock} {i.unit}</td><td className="text-right">{i.reorderLevel}</td><td className="text-right">৳{i.costPerUnit}</td><td className="text-right">{tk(Math.round(i.stock * i.costPerUnit))}</td></tr>)}
        </tbody></table>
      </div>
      <ApiForm endpoint="/api/v1/admin/stock" title="Stock in / out / waste / count" submit="Record movement" fields={[
        { key: "itemId", label: "Item", type: "select", options: items.map((i) => ({ value: i.id, label: `${i.name} (${i.stock} ${i.unit})` })) },
        { key: "type", label: "Type", type: "select", options: [{ value: "OUT", label: "Used in production (out)" }, { value: "WASTE", label: "Waste / damaged" }, { value: "IN", label: "Stock in (no purchase)" }, { value: "RETURN", label: "Returned" }, { value: "ADJUST", label: "Physical count (set stock to)" }] },
        { key: "qty", label: "Quantity", type: "number", required: true },
        { key: "note", label: "Note" },
      ]} />
      <div className="card overflow-x-auto">
        <h2 className="p-4 pb-0 font-body text-lg font-bold">Recent movements</h2>
        <table className="table"><thead><tr><th>Date</th><th>Item</th><th>Type</th><th className="text-right">Qty</th><th>Note</th></tr></thead><tbody>
          {moves.map((m) => <tr key={m.id}><td>{fmtDate(m.createdAt, true)}</td><td>{m.item.name}</td><td>{m.type}</td><td className={`text-right ${m.qty < 0 ? "text-red-700" : "text-green-700"}`}>{m.qty > 0 ? "+" : ""}{m.qty} {m.item.unit}</td><td>{m.note}</td></tr>)}
        </tbody></table>
      </div>
      <Crud resource="inventory" title="Manage items" rows={items} canDelete={false} fields={[{ key: "name", label: "Name", required: true }, { key: "unit", label: "Unit (kg, pcs, L)", required: true }, { key: "reorderLevel", label: "Reorder level", type: "number" }, { key: "costPerUnit", label: "Cost / unit", type: "number" }, { key: "isActive", label: "Active", type: "checkbox" }]} />
    </div>
  );
}
