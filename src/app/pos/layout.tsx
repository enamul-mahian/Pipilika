import { redirect } from "next/navigation";
import { staffCan } from "@/lib/auth";

export const metadata = { title: "POS", robots: { index: false } };

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  if (!(await staffCan("pos.use"))) redirect("/staff-login?next=/pos");
  return <div className="min-h-screen bg-[#faf6f2]">{children}</div>;
}
