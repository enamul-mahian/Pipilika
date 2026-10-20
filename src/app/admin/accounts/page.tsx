import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, tk } from "@/lib/format";
import { accountBalances } from "@/lib/ledger";
import { buildReport } from "@/lib/reports";
import { startOfDay, startOfMonth } from "@/lib/metrics";
import { ApiForm, JournalForm } from "@/components/admin-forms";

export default async function Accounts({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const [bal, vouchers, closings, pnl, todayClosed] = await Promise.all([
    accountBalances(db),
    db.voucher.findMany({ where: account ? { entries: { some: { accountId: account } } } : {}, orderBy: { createdAt: "desc" }, take: 40, include: { entries: { include: { account: true } } } }),
    db.dailyCashClosing.findMany({ orderBy: { date: "desc" }, take: 10 }),
    buildReport("pnl", startOfMonth(), new Date()),
    db.dailyCashClosing.findUnique({ where: { date: startOfDay() } }),
  ]);
  const totD = bal.reduce((a, b) => a + b.debit, 0), totC = bal.reduce((a, b) => a + b.credit, 0);
  const cash = bal.find((a) => a.code === "1000")?.balance ?? 0;
  const sel = bal.find((a) => a.id === account);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-3xl">Accounts & ledger</h1><Link href="/admin/reports?type=pnl" className="btn-outline btn-sm">Full reports →</Link></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="p-4 pb-0 font-body text-lg font-bold">Trial balance</h2>
          <table className="table"><thead><tr><th>Account</th><th>Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead><tbody>
            {bal.map((a) => <tr key={a.id}><td><Link href={`?account=${a.id}`} className="text-brand">{a.code} · {a.name}</Link></td><td className="text-xs">{a.type}</td><td className="text-right">{tk(a.debit)}</td><td className="text-right">{tk(a.credit)}</td><td className="text-right font-semibold">{tk(a.balance)}</td></tr>)}
            <tr className="font-bold"><td colSpan={2}>Total {totD === totC ? "✓ balanced" : "⚠ not balanced"}</td><td className="text-right">{tk(totD)}</td><td className="text-right">{tk(totC)}</td><td /></tr>
          </tbody></table>
        </div>
        <div className="grid content-start gap-6">
          <div className="card p-4">
            <h2 className="mb-2 font-body text-lg font-bold">Profit & loss · this month</h2>
            <table className="w-full text-sm"><tbody>{pnl.rows.map((r) => <tr key={String(r[0])} className="border-b border-line"><td className="py-1.5">{r[0]}</td><td className={`text-right ${Number(r[1]) < 0 ? "text-red-700" : ""}`}>{tk(Number(r[1]))}</td></tr>)}<tr className="font-bold"><td className="py-2">{pnl.totals?.[0]}</td><td className="text-right">{tk(Number(pnl.totals?.[1]))}</td></tr></tbody></table>
          </div>
          {todayClosed ? <div className="card p-4 text-sm">Today is closed: expected {tk(todayClosed.expectedCash)}, counted {tk(todayClosed.countedCash)}, difference <b className={todayClosed.difference ? "text-red-700" : "text-green-700"}>{tk(todayClosed.difference)}</b>.</div> :
            <ApiForm endpoint="/api/v1/admin/cash-closing" title={`Daily cash closing (system cash: ${tk(cash)})`} submit="Close today" fields={[{ key: "countedCash", label: "Cash counted in drawer (৳)", type: "number", required: true }, { key: "note", label: "Note" }]} />}
        </div>
      </div>
      <JournalForm accounts={bal.map((a) => ({ id: a.id, code: a.code, name: a.name }))} />
      <div className="card overflow-x-auto">
        <h2 className="p-4 pb-0 font-body text-lg font-bold">{sel ? `Ledger: ${sel.name}` : "Cashbook / recent vouchers"} {sel && <Link href="?" className="text-sm font-normal text-brand">(show all)</Link>}</h2>
        <table className="table"><thead><tr><th>Date</th><th>Voucher</th><th>Narration</th><th>Entries</th></tr></thead><tbody>
          {vouchers.map((v) => <tr key={v.id}><td>{fmtDate(v.createdAt, true)}</td><td className="text-xs">{v.no}</td><td>{v.narration}</td><td className="text-xs">{v.entries.map((e) => <div key={e.id}>{e.account.name}: {e.debit ? `Dr ${tk(e.debit)}` : `Cr ${tk(e.credit)}`}</div>)}</td></tr>)}
        </tbody></table>
      </div>
      {closings.length > 0 && <div className="card overflow-x-auto"><h2 className="p-4 pb-0 font-body text-lg font-bold">Cash closings</h2><table className="table"><thead><tr><th>Date</th><th className="text-right">Expected</th><th className="text-right">Counted</th><th className="text-right">Difference</th><th>Note</th></tr></thead><tbody>{closings.map((c) => <tr key={c.id}><td>{fmtDate(c.date)}</td><td className="text-right">{tk(c.expectedCash)}</td><td className="text-right">{tk(c.countedCash)}</td><td className={`text-right ${c.difference ? "text-red-700" : ""}`}>{tk(c.difference)}</td><td>{c.note}</td></tr>)}</tbody></table></div>}
    </div>
  );
}
