import { db } from "@/lib/db";
import { fmtDate, tk } from "@/lib/format";
import { Crud } from "@/components/crud";
import { ApiForm, PurchaseForm } from "@/components/admin-forms";

export default async function Purchases() {
  const [suppliers, items, purchases, payments] = await Promise.all([
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.inventoryItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.purchase.findMany({ orderBy: { date: "desc" }, take: 30, include: { supplier: true, items: { include: { item: true } } } }),
    db.supplierPayment.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { supplier: true } }),
  ]);
  const totalDue = suppliers.reduce((a, s) => a + s.due, 0);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-3xl">Suppliers & purchases</h1><p className="text-sm text-muted">Total supplier due <b className="text-brand">{tk(totalDue)}</b></p></div>
      <PurchaseForm suppliers={suppliers} items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, costPerUnit: i.costPerUnit }))} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ApiForm endpoint="/api/v1/admin/supplier-payments" title="Pay a supplier" submit="Record payment" fields={[
          { key: "supplierId", label: "Supplier", type: "select", options: suppliers.map((s) => ({ value: s.id, label: `${s.name} (due ৳${s.due})` })) },
          { key: "amount", label: "Amount (৳)", type: "number", required: true },
          { key: "method", label: "Paid via", type: "select", options: [{ value: "CASH", label: "Cash" }, { value: "BKASH", label: "bKash" }, { value: "NAGAD", label: "Nagad" }, { value: "BANK", label: "Bank" }] },
          { key: "note", label: "Note" },
        ]} />
        <div className="card overflow-x-auto"><h2 className="p-4 pb-0 font-body text-lg font-bold">Recent supplier payments</h2><table className="table"><tbody>{payments.map((p) => <tr key={p.id}><td>{fmtDate(p.createdAt)}</td><td>{p.supplier.name}</td><td>{p.method}</td><td className="text-right font-semibold">{tk(p.amount)}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card overflow-x-auto">
        <h2 className="p-4 pb-0 font-body text-lg font-bold">Purchases</h2>
        <table className="table"><thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Due</th></tr></thead><tbody>
          {purchases.map((p) => <tr key={p.id}><td>{fmtDate(p.date)}<br /><span className="text-xs text-muted">{p.invoiceNo}</span></td><td>{p.supplier.name}</td><td className="text-xs">{p.items.map((i) => `${i.item.name} ${i.qty}${i.item.unit}`).join(", ")}</td><td className="text-right">{tk(p.total)}</td><td className="text-right">{tk(p.paid)}</td><td className="text-right">{p.due ? <b className="text-brand">{tk(p.due)}</b> : "—"}</td></tr>)}
        </tbody></table>
      </div>
      <Crud resource="suppliers" title="Suppliers" rows={suppliers} canDelete={false} fields={[{ key: "name", label: "Name", required: true }, { key: "phone", label: "Phone" }, { key: "address", label: "Address" }, { key: "due", label: "Due (৳)", type: "number", readOnly: true }]} />
    </div>
  );
}
