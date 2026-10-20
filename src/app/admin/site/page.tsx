import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { NewPageForm, LayoutEditor } from "@/components/admin-site";

export default async function SiteEditor() {
  const [pages, s] = await Promise.all([db.page.findMany({ orderBy: [{ isSystem: "desc" }, { title: "asc" }] }), getSettings()]);
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Site editor</h1>
      <div className="card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4"><h2 className="font-body text-lg font-bold">Pages</h2><NewPageForm /></div>
        <table className="table"><thead><tr><th>Page</th><th>Address</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>
          {pages.map((p) => {
            const draft = JSON.stringify(p.blocks) !== JSON.stringify(p.publishedBlocks);
            return (
              <tr key={p.id}>
                <td className="font-semibold">{p.title}{p.isSystem && <span className="chip ml-1 bg-line">system</span>}</td>
                <td><a href={p.slug === "home" ? "/" : `/${p.slug}`} target="_blank" className="text-brand">/{p.slug === "home" ? "" : p.slug}</a></td>
                <td>{p.isPublished ? <span className="chip bg-green-100 text-green-800">Published</span> : <span className="chip bg-line">Hidden</span>}{draft && p.isPublished && <span className="chip ml-1 bg-amber-100 text-amber-900">unpublished changes</span>}</td>
                <td className="text-xs">{fmtDate(p.updatedAt, true)}</td>
                <td className="text-right"><Link href={`/admin/site/${p.id}`} className="btn-outline btn-sm">Edit sections</Link></td>
              </tr>
            );
          })}
        </tbody></table>
      </div>
      <LayoutEditor store={s.store} header={s.header} footer={s.footer} />
    </div>
  );
}
