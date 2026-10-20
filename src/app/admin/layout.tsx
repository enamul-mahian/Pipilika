import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { LogoutButton } from "@/components/logout-button";
import { AdminNav } from "@/components/admin-nav";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export const metadata = { title: "Admin", robots: { index: false } };

const NAV: [string, string, Permission][] = [
  ["/admin", "Dashboard", "dashboard.view"],
  ["/pos", "POS", "pos.use"],
  ["/admin/orders", "Orders", "orders.view"],
  ["/admin/orders?type=CUSTOM", "Custom cakes", "orders.view"],
  ["/admin/payments", "Payments", "payments.verify"],
  ["/admin/products", "Products", "products.manage"],
  ["/admin/categories", "Categories", "products.manage"],
  ["/admin/cake", "Cake builder", "cake.manage"],
  ["/admin/gallery", "Gallery", "products.manage"],
  ["/admin/customers", "Customers", "customers.view"],
  ["/admin/chats", "Chats", "chat.use"],
  ["/admin/coupons", "Coupons & delivery", "coupons.manage"],
  ["/admin/inventory", "Inventory", "inventory.manage"],
  ["/admin/purchases", "Suppliers & purchases", "inventory.manage"],
  ["/admin/expenses", "Expenses", "accounts.manage"],
  ["/admin/accounts", "Accounts & ledger", "accounts.manage"],
  ["/admin/reports", "Reports", "reports.view"],
  ["/admin/reviews", "Reviews", "reviews.manage"],
  ["/admin/site", "Site editor", "site.manage"],
  ["/admin/settings", "Settings & SEO", "site.manage"],
  ["/admin/staff", "Staff & roles", "staff.manage"],
  ["/admin/audit", "Audit log", "staff.manage"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getStaff();
  if (!s) redirect("/staff-login");
  const items = NAV.filter(([, , p]) => can(s.perms, p));
  // Per-page permission: match the longest nav prefix for this path.
  const path = (await headers()).get("x-pathname") ?? "/admin";
  const rule = NAV.filter(([h]) => !h.includes("?") && (path === h || (h !== "/admin" && path.startsWith(h + "/")) || path === h)).sort((a, b) => b[0].length - a[0].length)[0];
  const denied = rule && !can(s.perms, rule[2]);
  const [pendingPay, openChats, newCustom] = await Promise.all([
    db.payment.count({ where: { status: "VERIFICATION_REQUIRED" } }),
    db.conversation.count({ where: { status: "OPEN" } }),
    db.order.count({ where: { status: "DESIGN_SUBMITTED" } }),
  ]);
  const badges: Record<string, number> = { "/admin/payments": pendingPay, "/admin/chats": openChats, "/admin/orders?type=CUSTOM": newCustom };
  return (
    <div className="min-h-screen bg-[#faf6f2] lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="bg-cocoa text-white/85 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-2 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" className="h-9 w-9 rounded-full" />
          <div><b className="block font-display text-xl font-normal text-white">Pipilika</b><span className="text-xs text-white/60">{s.name} · {s.role?.name}</span></div>
        </div>
        <AdminNav items={items.map(([href, label]) => ({ href, label, badge: badges[href] ?? 0 }))} />
        <div className="grid gap-1 p-3 text-sm">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-white/10" target="_blank">View shop ↗</Link>
          <LogoutButton className="rounded-lg px-3 py-2 text-left hover:bg-white/10" />
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-6">{denied ? <div className="card mx-auto mt-10 max-w-md p-8 text-center"><h1 className="text-2xl">No access</h1><p className="mt-2 text-muted">Your role ({s.role?.name}) can&apos;t open this page. Ask the owner for permission.</p><Link href={items[0]?.[0] ?? "/"} className="btn-primary mt-4">Go back</Link></div> : children}</main>
    </div>
  );
}
