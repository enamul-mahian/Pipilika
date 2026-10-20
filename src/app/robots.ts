import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const u = (process.env.NEXT_PUBLIC_SITE_URL || "https://thepipilika.com").replace(/\/$/, "");
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/pos", "/account", "/api", "/print", "/checkout", "/cart", "/o/", "/staff-login"] }], sitemap: `${u}/sitemap.xml`, host: u };
}
