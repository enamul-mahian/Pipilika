"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, useAction, Alert } from "./ui";
import { ImageInput } from "./crud";
import { slugify } from "@/lib/format";
import { ProductOptions } from "./product-options";

type Opt = { name: string; priceDelta: number; isDefault: boolean; rules?: any };
type Group = { name: string; type: string; required: boolean; minSelect: number; maxSelect: number | null; rules?: any; options: Opt[] };

export function ProductEditor({ product: p, categories }: { product: any | null; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const a = useAction();
  const [f, setF] = useState({
    name: p?.name ?? "", slug: p?.slug ?? "", description: p?.description ?? "", type: p?.type ?? "FIXED", categoryId: p?.categoryId ?? categories[0]?.id ?? "",
    basePrice: p?.basePrice ?? 0, compareAt: p?.compareAt ?? "", stock: p?.stock ?? "", madeToOrder: p?.madeToOrder ?? false, minQty: p?.minQty ?? 1,
    isFeatured: p?.isFeatured ?? false, isActive: p?.isActive ?? true, tags: (p?.tags ?? []).join(", "), seoTitle: p?.seoTitle ?? "", seoDesc: p?.seoDesc ?? "",
  });
  const [images, setImages] = useState<{ url: string; alt?: string }[]>(p?.images?.map((i: any) => ({ url: i.url, alt: i.alt })) ?? []);
  const [variants, setVariants] = useState<{ name: string; price: number; weightG: number | "" }[]>(p?.variants?.map((v: any) => ({ name: v.name, price: v.price, weightG: v.weightG ?? "" })) ?? []);
  const [groups, setGroups] = useState<Group[]>(p?.modifiers?.map((g: any) => ({ name: g.name, type: g.type, required: g.required, minSelect: g.minSelect, maxSelect: g.maxSelect, rules: g.rules, options: g.options.map((o: any) => ({ name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault, rules: o.rules })) })) ?? []);
  const set = (k: string, v: any) => setF((c) => ({ ...c, [k]: v }));
  const upG = (i: number, patch: Partial<Group>) => setGroups(groups.map((g, k) => (k === i ? { ...g, ...patch } : g)));
  const upO = (gi: number, oi: number, patch: Partial<Opt>) => upG(gi, { options: groups[gi].options.map((o, k) => (k === oi ? { ...o, ...patch } : o)) });

  const save = () => a.run(async () => {
    const r = await api<{ id: string }>("/api/v1/admin/products", { body: {
      ...f, id: p?.id, slug: f.slug || slugify(f.name), basePrice: Number(f.basePrice), compareAt: f.compareAt === "" ? null : Number(f.compareAt), stock: f.stock === "" ? null : Number(f.stock), minQty: Number(f.minQty) || 1,
      tags: f.tags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean), images: images.filter((i) => i.url),
      variants: variants.filter((v) => v.name).map((v) => ({ ...v, price: Number(v.price), weightG: v.weightG === "" ? null : Number(v.weightG) })),
      modifiers: groups.filter((g) => g.name).map((g) => ({ ...g, options: g.options.filter((o) => o.name).map((o) => ({ ...o, priceDelta: Number(o.priceDelta) })) })),
    } });
    if (!p) router.replace(`/admin/products/${r.id}`);
    router.refresh();
  }, "Product saved");

  const preview = { id: "preview", slug: f.slug, name: f.name, image: images[0]?.url ?? null, basePrice: Number(f.basePrice) || 0, minQty: Number(f.minQty) || 1, soldOut: false, variants: variants.filter((v) => v.name).map((v, i) => ({ id: "v" + i, name: v.name, price: Number(v.price) })), modifiers: groups.map((g, gi) => ({ id: "g" + gi, name: g.name, type: g.type as any, required: g.required, minSelect: g.minSelect, maxSelect: g.maxSelect, rules: g.rules, options: g.options.map((o, oi) => ({ id: `o${gi}_${oi}`, name: o.name, priceDelta: Number(o.priceDelta), isDefault: o.isDefault, rules: o.rules })) })) };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/admin/products" className="text-sm text-muted">← Products</Link><h1 className="text-3xl">{p ? "Edit product" : "New product"}</h1></div>
        <div className="flex gap-2">
          {p && <Link href={`/product/${p.slug}`} target="_blank" className="btn-outline btn-sm">View ↗</Link>}
          {p && <button className="btn-outline btn-sm text-red-700" onClick={() => window.confirm("Delete this product? Past orders are kept.") && a.run(async () => { await api(`/api/v1/admin/products?id=${p.id}`, { method: "DELETE" }); router.push("/admin/products"); })}>Delete</button>}
          <button className="btn-primary" disabled={a.busy} onClick={save}>{a.busy ? "Saving…" : "Save product"}</button>
        </div>
      </div>
      <Alert error={a.error} msg={a.msg} />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <section className="card grid gap-3 p-5 md:grid-cols-2">
            <div className="md:col-span-2"><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={f.name} onChange={(e) => { set("name", e.target.value); if (!p) set("slug", slugify(e.target.value)); }} /></div>
            <div><label className="label" htmlFor="ps">URL slug</label><input id="ps" className="input" value={f.slug} onChange={(e) => set("slug", e.target.value)} /></div>
            <div><label className="label" htmlFor="pc">Category</label><select id="pc" className="input" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="md:col-span-2"><label className="label" htmlFor="pd">Description</label><textarea id="pd" className="input" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
            <div><label className="label" htmlFor="pt">Product type</label><select id="pt" className="input" value={f.type} onChange={(e) => set("type", e.target.value)}><option value="FIXED">Fixed product</option><option value="CUSTOM">Custom / variable</option></select></div>
            <div><label className="label" htmlFor="pb">Base / starting price (৳)</label><input id="pb" type="number" className="input" value={f.basePrice} onChange={(e) => set("basePrice", e.target.value)} /></div>
            <div><label className="label" htmlFor="pca">Compare-at price (sale)</label><input id="pca" type="number" className="input" value={f.compareAt} onChange={(e) => set("compareAt", e.target.value)} /></div>
            <div><label className="label" htmlFor="pst">Stock (empty = unlimited)</label><input id="pst" type="number" className="input" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></div>
            <div><label className="label" htmlFor="pmq">Minimum quantity</label><input id="pmq" type="number" min={1} className="input" value={f.minQty} onChange={(e) => set("minQty", e.target.value)} /></div>
            <div><label className="label" htmlFor="ptg">Tags (comma separated)</label><input id="ptg" className="input" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></div>
            <div className="flex flex-wrap gap-4 md:col-span-2">
              {[["madeToOrder", "Made to order"], ["isFeatured", "Featured on home"], ["isActive", "Visible in shop"]].map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={(f as any)[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>)}
            </div>
          </section>

          <section className="card grid gap-3 p-5">
            <div className="flex items-center justify-between"><h2 className="font-body font-bold">Images <span className="font-normal text-muted">(first = cover)</span></h2><button className="btn-outline btn-sm" onClick={() => setImages([...images, { url: "" }])}>+ Image</button></div>
            {images.map((im, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1"><ImageInput value={im.url} onChange={(v) => setImages(images.map((x, k) => (k === i ? { ...x, url: v } : x)))} /></div>
                <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => { const n = [...images]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setImages(n); }} aria-label="Move up">↑</button>
                <button className="btn-ghost btn-sm text-red-700" onClick={() => setImages(images.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
              </div>
            ))}
          </section>

          <section className="card grid gap-3 p-5">
            <div className="flex items-center justify-between"><h2 className="font-body font-bold">Sizes / weights <span className="font-normal text-muted">(price per size; overrides base price)</span></h2><button className="btn-outline btn-sm" onClick={() => setVariants([...variants, { name: "", price: Number(f.basePrice) || 0, weightG: "" }])}>+ Size</button></div>
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_120px_auto] gap-2">
                <input className="input" placeholder="e.g. 1 kg" value={v.name} onChange={(e) => setVariants(variants.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} aria-label="Size name" />
                <input className="input" type="number" placeholder="Price" value={v.price} onChange={(e) => setVariants(variants.map((x, k) => (k === i ? { ...x, price: Number(e.target.value) } : x)))} aria-label="Price" />
                <input className="input" type="number" placeholder="grams" value={v.weightG} onChange={(e) => setVariants(variants.map((x, k) => (k === i ? { ...x, weightG: e.target.value === "" ? "" : Number(e.target.value) } : x)))} aria-label="Weight in grams" />
                <button className="btn-ghost btn-sm text-red-700" onClick={() => setVariants(variants.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
              </div>
            ))}
          </section>

          <section className="card grid gap-4 p-5">
            <div className="flex items-center justify-between"><h2 className="font-body font-bold">Customization options (modifiers)</h2><button className="btn-outline btn-sm" onClick={() => setGroups([...groups, { name: "", type: "SINGLE", required: false, minSelect: 0, maxSelect: null, options: [{ name: "", priceDelta: 0, isDefault: false }] }])}>+ Option group</button></div>
            {groups.length === 0 && <p className="text-sm text-muted">e.g. Filling (Chicken +৳20 / Beef +৳30), Onion yes/no, Extra cheese, Message on cake…</p>}
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-line p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_160px_auto_auto]">
                  <input className="input" placeholder="Group name (e.g. Filling)" value={g.name} onChange={(e) => upG(gi, { name: e.target.value })} aria-label="Group name" />
                  <select className="input" value={g.type} onChange={(e) => upG(gi, { type: e.target.value })} aria-label="Type"><option value="SINGLE">Single choice</option><option value="MULTI">Multiple choice</option><option value="BOOLEAN">Yes / No</option><option value="QUANTITY">Quantity add-on</option><option value="TEXT">Text instruction</option></select>
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" className="accent-brand" checked={g.required} onChange={(e) => upG(gi, { required: e.target.checked })} />Required</label>
                  <button className="btn-ghost btn-sm text-red-700" onClick={() => setGroups(groups.filter((_, k) => k !== gi))}>Remove group</button>
                </div>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  {g.type === "MULTI" && <label className="flex items-center gap-2">Max choices<input type="number" className="input !w-20 !py-1" value={g.maxSelect ?? ""} onChange={(e) => upG(gi, { maxSelect: e.target.value ? Number(e.target.value) : null })} /></label>}
                  <label className="flex items-center gap-2">Only for sizes<input className="input !py-1" placeholder="e.g. 1 kg, 2 kg (blank = all)" value={(g.rules?.onlyForVariants ?? []).join(", ")} onChange={(e) => upG(gi, { rules: { onlyForVariants: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} /></label>
                </div>
                {g.type !== "TEXT" && (
                  <div className="mt-2 grid gap-2">
                    {g.options.map((o, oi) => (
                      <div key={oi} className="grid grid-cols-[1fr_100px_auto_1fr_auto] items-center gap-2 text-sm">
                        <input className="input !py-1.5" placeholder="Option" value={o.name} onChange={(e) => upO(gi, oi, { name: e.target.value })} aria-label="Option name" />
                        <input className="input !py-1.5" type="number" placeholder="+৳" value={o.priceDelta} onChange={(e) => upO(gi, oi, { priceDelta: Number(e.target.value) })} aria-label="Price change" />
                        <label className="flex items-center gap-1"><input type="checkbox" className="accent-brand" checked={o.isDefault} onChange={(e) => upO(gi, oi, { isDefault: e.target.checked })} />Default</label>
                        <input className="input !py-1.5" placeholder="Not with… (option names)" value={(o.rules?.excludes ?? []).join(", ")} onChange={(e) => upO(gi, oi, { rules: { ...(o.rules ?? {}), excludes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} aria-label="Excludes" />
                        <button className="btn-ghost btn-sm text-red-700" onClick={() => upG(gi, { options: g.options.filter((_, k) => k !== oi) })} aria-label="Remove option">✕</button>
                      </div>
                    ))}
                    <button className="btn-ghost btn-sm w-fit" onClick={() => upG(gi, { options: [...g.options, { name: "", priceDelta: 0, isDefault: false }] })}>+ Option</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="card grid gap-3 p-5">
            <h2 className="font-body font-bold">SEO</h2>
            <input className="input" placeholder="SEO title (default: product name)" value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} aria-label="SEO title" />
            <textarea className="input" rows={2} placeholder="Meta description" value={f.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} aria-label="Meta description" />
          </section>
        </div>
        <aside className="card h-fit p-5 xl:sticky xl:top-4">
          <h2 className="font-body font-bold">Live customer preview</h2>
          <p className="text-xs text-muted">Test the price rules before saving.</p>
          {f.name ? <ProductOptions product={preview} compact onAdd={() => {}} /> : <p className="mt-3 text-sm text-muted">Enter a name to preview.</p>}
        </aside>
      </div>
    </div>
  );
}
