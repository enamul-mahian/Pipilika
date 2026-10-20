import { db } from "@/lib/db";
import { fmtDate, tk } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/ledger";
import { startOfMonth } from "@/lib/metrics";
import { ApiForm, DeleteButton } from "@/components/admin-forms";
import { Bars } from "@/components/charts";

export default async function Expenses() {
  const [rows, month] = await Promise.all([
    db.expense.findMany({ orderBy: { date: "desc" }, take: 60 }),
    db.expense.groupBy({ by: ["category"], where: { date: { gte: startOfMonth() } }, _sum: { amount: true } }),
  ]);
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Expenses</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <ApiForm endpoint="/api/v1/admin/expenses" title="Add expense" submit="Save expense" fields={[
          { key: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })) },
          { key: "amount", label: "Amount (৳)", type: "number", required: true },
          { key: "method", label: "Paid via", type: "select", options: [{ value: "CASH", label: "Cash" }, { value: "BKASH", label: "bKash" }, { value: "NAGAD", label: "Nagad" }, { value: "BANK", label: "Bank" }] },
          { key: "date", label: "Date", type: "date" },
          { key: "note", label: "Note", type: "textarea" },
        ]} />
        <div className="card p-4"><h2 className="mb-3 font-body text-lg font-bold">This month by category</h2>{month.length ? <Bars data={month.map((m) => ({ label: m.category, value: m._sum.amount ?? 0 }))} /> : <p className="text-muted">No expenses this month.</p>}</div>
      </div>
      <div className="card overflow-x-auto">
        <table className="table"><thead><tr><th>Date</th><th>Category</th><th>Method</th><th>Note</th><th className="text-right">Amount</th><th /></tr></thead><tbody>
          {rows.map((e) => <tr key={e.id}><td>{fmtDate(e.date)}</td><td>{e.category}</td><td>{e.method}</td><td>{e.note}</td><td className="text-right font-semibold">{tk(e.amount)}</td><td className="text-right"><DeleteButton endpoint={`/api/v1/admin/expenses?id=${e.id}`} confirm="Delete this expense and its ledger entry?" /></td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
