import Link from "next/link";
import { buildReport, parseRange, REPORTS, type ReportType } from "@/lib/reports";
import { Bars } from "@/components/charts";

export default async function Reports({ searchParams }: { searchParams: Promise<{ type?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const type = (sp.type && sp.type in REPORTS ? sp.type : "sales") as ReportType;
  const { from, to } = parseRange(sp);
  const r = await buildReport(type, from, to);
  const qs = `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
  const chart = ["sales", "products", "payments", "customers"].includes(type) ? r.rows.slice(0, 12).map((row) => ({ label: String(row[0]).slice(0, 14), value: Number(row[row.length - 1]) })) : null;
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Reports</h1>
      <div className="flex flex-wrap gap-1">{(Object.keys(REPORTS) as ReportType[]).map((k) => <Link key={k} href={`?type=${k}&${qs}`} className={`tab ${k === type ? "tab-on" : ""}`}>{REPORTS[k]}</Link>)}</div>
      <form className="card flex flex-wrap items-end gap-2 p-3">
        <input type="hidden" name="type" value={type} />
        <div><label className="label">From</label><input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className="input !py-2" /></div>
        <div><label className="label">To</label><input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} className="input !py-2" /></div>
        <button className="btn-outline btn-sm">Apply</button>
        <a href={`/api/v1/admin/reports/${type}?format=csv&${qs}`} className="btn-outline btn-sm ml-auto">Download CSV</a>
        <a href={`/print/report?type=${type}&${qs}`} target="_blank" className="btn-outline btn-sm">PDF / Print</a>
      </form>
      {chart && chart.length > 0 && <div className="card p-4"><Bars data={chart} /></div>}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr>{r.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {r.rows.length === 0 && <tr><td colSpan={r.columns.length} className="py-8 text-center text-muted">No data for this period.</td></tr>}
            {r.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className={typeof c === "number" ? "text-right" : ""}>{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>)}
            {r.totals && <tr className="font-bold">{r.totals.map((c, j) => <td key={j} className={typeof c === "number" ? "text-right" : ""}>{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
