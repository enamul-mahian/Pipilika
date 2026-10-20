import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // CSRF: browser requests that mutate must come from our own origin (cookies are SameSite=Lax too).
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    const origin = req.headers.get("origin");
    const hasBearer = req.headers.get("authorization")?.startsWith("Bearer ");
    const isWebhook = pathname.startsWith("/api/v1/whatsapp/webhook");
    if (origin && !hasBearer && !isWebhook) {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
  }

  const needsStaff = pathname.startsWith("/admin") || pathname.startsWith("/pos");
  const needsUser = pathname.startsWith("/account");
  if (needsStaff || needsUser) {
    const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!s || (needsStaff && s.kind !== "STAFF")) {
      const url = req.nextUrl.clone();
      url.pathname = needsStaff ? "/staff-login" : "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }
  // Let server layouts know the path (used for per-page permission checks).
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*", "/pos/:path*", "/account/:path*", "/api/:path*"] };
