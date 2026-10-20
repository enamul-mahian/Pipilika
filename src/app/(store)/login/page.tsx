import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OtpLogin } from "@/components/otp-login";
export const metadata: Metadata = { title: "Log in or sign up", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if (s) redirect(s.kind === "STAFF" && next === "/account" ? "/admin" : next);
  return (
    <div className="wrap max-w-md py-12">
      <h1 className="text-center text-4xl">Welcome to Pipilika</h1>
      <p className="mt-2 text-center text-muted">Log in or create an account with a one-time code. No password needed.</p>
      <OtpLogin next={next} sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ""} />
      <p className="mt-6 text-center text-sm text-muted">Staff? <a href="/staff-login" className="text-brand underline">Staff login</a></p>
    </div>
  );
}
