import { redirect } from "next/navigation";
import { staffCan } from "@/lib/auth";
import { buildReport, parseRange, REPORTS, type ReportType } from "@/lib/reports";
import { fmtDate } from "@/lib/format";
import { AutoPrint } from "@/components/auto-print";

export const metadata = { title: "Report", robots: { index: false } };

export default async function PrintReport({ searchParams }: { searchParams: Promise<{ type?: string; from?: string; to?: string }> }) {
  if (!(await staffCan("reports.view"))) redirect("/staff-login");
  const sp = await searchParams;
  const type = (sp.type && sp.type in REPORTS ? sp.type : "sales") as ReportType;
  const { from, to } = parseRange(sp);
  const r = await buildReport(type, from, to);
  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-sm text-ink">
      <AutoPrint />
      <h1 className="font-display text-3xl">Pipilika · {r.title}</h1>
      <p className="mb-4 text-muted">{fmtDate(from)} – {fmtDate(to)}</p>
      <table className="w-full border-collapse text-xs">
        <thead><tr>{r.columns.map((c) => <th key={c} className="border-b-2 border-ink py-1 text-left">{c}</th>)}</tr></thead>
        <tbody>
          {r.rows.map((row, i) => <tr key={i} className="border-b border-line">{row.map((c, j) => <td key={j} className={`py-1 ${typeof c === "number" ? "text-right" : ""}`}>{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>)}
          {r.totals && <tr className="font-bold">{r.totals.map((c, j) => <td key={j} className={`py-1 ${typeof c === "number" ? "text-right" : ""}`}>{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}
