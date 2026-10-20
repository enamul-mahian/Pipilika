import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export default async function Audit({ searchParams }: { searchParams: Promise<{ entity?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.entity ? { entity: sp.entity } : {};
  const [rows, entities] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, skip: (page - 1) * 100 }),
    db.auditLog.groupBy({ by: ["entity"], _count: true }),
  ]);
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Audit log</h1>
      <div className="flex flex-wrap gap-1"><Link href="?" className={`tab ${!sp.entity ? "tab-on" : ""}`}>All</Link>{entities.map((e) => <Link key={e.entity} href={`?entity=${e.entity}`} className={`tab ${sp.entity === e.entity ? "tab-on" : ""}`}>{e.entity} ({e._count})</Link>)}</div>
      <div className="card overflow-x-auto">
        <table className="table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No activity yet.</td></tr>}
          {rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDate(r.createdAt, true)}</td><td>{r.actorName ?? "system"}</td><td>{r.action}</td><td className="text-xs">{r.entity}<br />{r.entityId}</td><td className="max-w-md truncate font-mono text-[11px]" title={JSON.stringify(r.data)}>{r.data ? JSON.stringify(r.data).slice(0, 160) : ""}</td></tr>)}
        </tbody></table>
      </div>
      <div className="flex justify-end gap-2">{page > 1 && <Link className="btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(sp.entity ? { entity: sp.entity } : {}), page: String(page - 1) })}`}>← Newer</Link>}{rows.length === 100 && <Link className="btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(sp.entity ? { entity: sp.entity } : {}), page: String(page + 1) })}`}>Older →</Link>}</div>
    </div>
  );
}
