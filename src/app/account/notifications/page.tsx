import Link from "next/link";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { MarkAllRead } from "@/components/account-tools";
export default async function Notifications() {
  const u = (await getUser())!;
  const list = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-3xl">Notifications</h1><MarkAllRead /></div>
      {list.length === 0 ? <p className="mt-4 text-muted">No notifications.</p> : (
        <ul className="mt-4 grid gap-2">
          {list.map((n) => (
            <li key={n.id} className={`card p-4 ${n.readAt ? "" : "border-brand/40 bg-blush/40"}`}>
              <p className="flex justify-between text-sm"><b>{n.title}</b><span className="text-muted">{fmtDate(n.createdAt, true)}</span></p>
              <p className="text-sm">{n.body}</p>
              {n.link && <Link href={n.link.startsWith("/admin") ? "/account" : n.link} className="text-sm text-brand underline">Open</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
