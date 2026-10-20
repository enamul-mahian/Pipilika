import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LogoutButton } from "@/components/logout-button";
import { db } from "@/lib/db";

const NAV = [
  ["/account", "Dashboard"], ["/account/orders", "My orders"], ["/account/designs", "Saved designs"], ["/account/wishlist", "Wishlist"],
  ["/account/addresses", "Addresses"], ["/account/notifications", "Notifications"], ["/account/profile", "Profile"],
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect("/login?next=/account");
  const unread = await db.notification.count({ where: { userId: u.id, readAt: null } });
  return (
    <>
      <Header />
      <div className="wrap grid gap-6 py-8 md:grid-cols-[220px_1fr]">
        <aside>
          <p className="font-display text-2xl">Hi, {u.name.split(" ")[0]}</p>
          <nav className="mt-3 flex gap-1 overflow-x-auto md:flex-col" aria-label="Account">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="tab whitespace-nowrap">{label}{href.endsWith("notifications") && unread > 0 && <span className="chip ml-1 bg-brand text-white">{unread}</span>}</Link>
            ))}
            <Link href="/custom-cake" className="tab whitespace-nowrap">Design a cake</Link>
            {u.kind === "STAFF" && <Link href="/admin" className="tab whitespace-nowrap">Admin panel</Link>}
            <LogoutButton className="tab whitespace-nowrap text-left" />
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
      <Footer />
    </>
  );
}
