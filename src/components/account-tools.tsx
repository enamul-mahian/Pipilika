"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useAction, Alert, fileToDataUrl, ConfirmButton } from "./ui";
import { useCart } from "./cart";

export function ReviewForm({ orderId, productId, name }: { orderId: string; productId: string; name: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const a = useAction();
  const router = useRouter();
  return (
    <form className="card grid gap-3 p-5" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/reviews", { body: { orderId, productId, rating, comment, photo } }); router.refresh(); }, "Thanks for your review!"); }}>
      <h3 className="font-body font-bold">Review “{name}”</h3>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className={`text-2xl ${n <= rating ? "text-gold" : "text-line"}`}>★</button>)}</div>
      <textarea className="input" required minLength={3} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was it?" />
      <input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await fileToDataUrl(f, 1200)); }} aria-label="Add a photo" />
      <Alert error={a.error} msg={a.msg} />
      <button className="btn-primary w-fit" disabled={a.busy}>Submit review</button>
    </form>
  );
}

export function ReorderButton({ items }: { items: { productId: string; name: string; qty: number; image: string | null; unitPrice: number }[] }) {
  const { add } = useCart();
  const router = useRouter();
  if (!items.length) return null;
  return (
    <button className="btn-outline w-fit" onClick={async () => {
      const r = await fetch(`/api/v1/products?ids=${items.map((i) => i.productId).join(",")}`).then((x) => x.json()).catch(() => null);
      for (const i of items) {
        const prod = r?.items?.find((x: any) => x.id === i.productId);
        if (!prod) continue;
        if (prod.variants.length) { router.push(`/product/${prod.slug}`); return; }
        add({ productId: prod.id, slug: prod.slug, name: prod.name, image: i.image, qty: i.qty, unitPrice: prod.basePrice });
      }
      router.push("/cart");
    }}>Reorder these items</button>
  );
}

export function ProfileForm({ user }: { user: { name: string; email: string | null; phone: string | null; birthday: string | null; marketingOptIn: boolean } }) {
  const [f, setF] = useState({ name: user.name, birthday: user.birthday ?? "", marketingOptIn: user.marketingOptIn });
  const a = useAction();
  return (
    <div className="grid gap-6">
      <form className="card grid gap-4 p-5" onSubmit={(e) => { e.preventDefault(); a.run(() => api("/api/v1/account", { method: "PATCH", body: f }), "Saved"); }}>
        <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <p className="text-sm text-muted">Login: {user.phone ?? user.email}</p>
        <div><label className="label" htmlFor="bd">Birthday (optional — for a surprise offer)</label><input id="bd" type="date" className="input" value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={f.marketingOptIn} onChange={(e) => setF({ ...f, marketingOptIn: e.target.checked })} /> Send me offers and new cake updates</label>
        <Alert error={a.error} msg={a.msg} />
        <button className="btn-primary w-fit" disabled={a.busy}>Save profile</button>
      </form>
      <div className="card border-red-200 p-5">
        <h2 className="font-body font-bold text-red-700">Delete account</h2>
        <p className="text-sm text-muted">Your personal details will be removed. Order records are kept anonymised for accounting.</p>
        <ConfirmButton className="btn mt-3 border border-red-300 text-red-700" confirm="Delete your account permanently?" onConfirm={async () => { await api("/api/v1/account", { method: "DELETE" }); location.href = "/"; }}>Delete my account</ConfirmButton>
      </div>
    </div>
  );
}

export function AddressBook({ list }: { list: { id: string; label: string; name: string; phone: string; line: string; area: string | null; city: string; isDefault: boolean }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ label: "Home", name: "", phone: "", line: "", area: "", city: "Dhaka", isDefault: list.length === 0 });
  const a = useAction();
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((x) => (
          <li key={x.id} className="card p-4 text-sm">
            <b>{x.label}</b> {x.isDefault && <span className="chip bg-blush text-brand">Default</span>}
            <p>{x.name} · {x.phone}</p><p className="text-muted">{x.line}{x.area ? ", " + x.area : ""}, {x.city}</p>
            <ConfirmButton className="mt-2 text-red-700 underline" confirm="Delete this address?" onConfirm={async () => { await api(`/api/v1/account/addresses?id=${x.id}`, { method: "DELETE" }); router.refresh(); }}>Delete</ConfirmButton>
          </li>
        ))}
      </ul>
      <form className="card grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); a.run(async () => { await api("/api/v1/account/addresses", { body: f }); router.refresh(); }, "Address added"); }}>
        <h2 className="font-body font-bold sm:col-span-2">Add address</h2>
        <input className="input" placeholder="Label (Home, Office)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <input className="input" required placeholder="Recipient name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" required placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input" placeholder="Area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
        <input className="input sm:col-span-2" required placeholder="House, road, details" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} /> Default address</label>
        <Alert error={a.error} msg={a.msg} />
        <button className="btn-primary w-fit sm:col-span-2" disabled={a.busy}>Save address</button>
      </form>
    </div>
  );
}

export function MarkAllRead() {
  const router = useRouter();
  return <button className="btn-outline btn-sm" onClick={async () => { await api("/api/v1/account/notifications", { method: "POST", body: {} }); router.refresh(); }}>Mark all read</button>;
}
