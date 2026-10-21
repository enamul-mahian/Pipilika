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
      // Browsers tell us whether the request came from another site. Trust that first: it works behind any
      // hosting proxy (Hostinger, Railway…) where the Host header may differ from the public domain.
      const fetchSite = req.headers.get("sec-fetch-site");
      if (fetchSite) {
        if (fetchSite === "cross-site") return NextResponse.json({ error: "Bad origin" }, { status: 403 });
      } else {
        const bare = (h?: string | null) => (h ?? "").split(",")[0].trim().toLowerCase().replace(/^www\./, "");
        let site = "";
        try { site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host; } catch {}
        const allowed = [req.headers.get("x-forwarded-host"), req.headers.get("host"), req.nextUrl.host, site].map(bare).filter(Boolean);
        let o = "";
        try { o = bare(new URL(origin).host); } catch {}
        if (!allowed.includes(o)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
      }
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
