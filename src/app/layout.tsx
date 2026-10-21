import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { CartProvider } from "@/components/cart";
import { Analytics } from "@/components/analytics";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(site),
    title: { default: s.seo.defaultTitle, template: s.seo.titleTemplate },
    description: s.seo.description,
    keywords: s.seo.keywords,
    openGraph: { type: "website", siteName: s.store.name, images: [s.seo.ogImage], locale: "en_BD" },
    twitter: { card: "summary_large_image" },
    icons: { icon: s.store.favicon || s.store.logo, apple: s.store.favicon || s.store.logo },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = { themeColor: "#b3161f", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const org = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: s.store.name,
    url: site,
    logo: site + s.store.logo,
    telephone: s.store.phone,
    email: s.store.email,
    address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD", streetAddress: s.store.address },
    founder: { "@type": "Person", name: "Roksana Naznin" },
    sameAs: Object.values(s.footer.social).filter(Boolean),
  };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Dancing+Script:wght@600&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
        <Analytics ga4={s.analytics.ga4} gtm={s.analytics.gtm} pixel={s.analytics.metaPixel} requireConsent={s.analytics.requireConsent} />
      </body>
    </html>
  );
}
