import type { Metadata } from "next";
import { StaffLogin } from "@/components/staff-login";
export const metadata: Metadata = { title: "Staff login", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/admin";
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" className="mx-auto h-16 w-16 rounded-full" />
          <h1 className="mt-2 text-3xl text-brand">Pipilika Staff</h1>
        </div>
        <StaffLogin next={next} />
        <p className="mt-4 text-center text-sm"><a href="/" className="text-muted underline">← Back to shop</a></p>
      </div>
    </div>
  );
}
