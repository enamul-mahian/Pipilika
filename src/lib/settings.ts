import { cache } from "react";
import { db } from "./db";

export type NavLink = { label: string; href: string };
export type SiteSettings = {
  store: { name: string; tagline: string; founder: string; phone: string; whatsapp: string; email: string; address: string; hours: string; logo: string; favicon: string };
  header: { menu: NavLink[]; announcement: string };
  footer: { quote: string; about: string; columns: { title: string; links: NavLink[] }[]; social: { facebook: string; instagram: string; youtube: string; tiktok: string }; copyright: string };
  payments: { methods: Record<string, { enabled: boolean; instructions: string }>; advancePercent: number };
  seo: { defaultTitle: string; titleTemplate: string; description: string; ogImage: string; keywords: string };
  analytics: { ga4: string; gtm: string; metaPixel: string; requireConsent: boolean };
  features: Record<string, boolean>;
  app: { minVersion: string; latestVersion: string; forceUpdate: boolean };
  notifications: Record<string, string>;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  store: {
    name: "Pipilika",
    tagline: "Life is sweeter with a little cake.",
    founder: "Founded by Roksana Naznin",
    phone: "+8801700000000",
    whatsapp: "8801700000000",
    email: "hello@thepipilika.com",
    address: "Dhaka, Bangladesh",
    hours: "Every day, 9am – 10pm",
    logo: "/brand/logo.png",
    favicon: "",
  },
  header: {
    announcement: "Free delivery on orders over ৳2,000 inside Dhaka · Use code WELCOME10 for 10% off",
    menu: [
      { label: "Home", href: "/" },
      { label: "Cakes", href: "/shop?category=cakes" },
      { label: "Pastries", href: "/shop?category=pastries" },
      { label: "Custom Cake", href: "/custom-cake" },
      { label: "Gallery", href: "/gallery" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  footer: {
    quote: "Life is sweeter with a little cake.",
    about: "Homemade premium cakes, pastries and custom celebration cakes from Dhaka.",
    columns: [
      { title: "Quick links", links: [{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: "Custom Cake", href: "/custom-cake" }, { label: "Offers", href: "/offers" }] },
      { title: "Help", links: [{ label: "Track order", href: "/track" }, { label: "FAQ", href: "/faq" }, { label: "Policies", href: "/policies" }, { label: "Contact", href: "/contact" }] },
    ],
    social: { facebook: "https://facebook.com/", instagram: "https://instagram.com/", youtube: "", tiktok: "" },
    copyright: "© Pipilika. All rights reserved.",
  },
  payments: {
    advancePercent: 50,
    methods: {
      BKASH: { enabled: true, instructions: "Send Money / Payment to bKash Merchant 01700-000000, then enter the TrxID." },
      NAGAD: { enabled: true, instructions: "Pay to Nagad Merchant 01700-000000, then enter the TrxID." },
      BANGLA_QR: { enabled: true, instructions: "Scan the Bangla QR at checkout with any banking/MFS app, then enter the reference." },
      BANK: { enabled: true, instructions: "Bank: Example Bank Ltd · A/C Pipilika · 0000000000 · Branch Dhanmondi. Enter the transfer reference." },
      COD: { enabled: true, instructions: "Pay cash when your order arrives (Dhaka only)." },
      CARD: { enabled: false, instructions: "Card payment gateway coming soon." },
    },
  },
  seo: {
    defaultTitle: "Pipilika — Custom Cakes & Bakery in Dhaka",
    titleTemplate: "%s | Pipilika",
    description: "Order custom birthday & wedding cakes, pastries, cookies and more from Pipilika, Dhaka. Design your own cake online.",
    ogImage: "/demo/hero.jpg",
    keywords: "cake dhaka, custom cake, birthday cake, bakery bangladesh, pipilika",
  },
  analytics: { ga4: "", gtm: "", metaPixel: "", requireConsent: true },
  features: { shapeDesigner: true, wafflePrint: true, sugarPrint: true, reviews: true, chat: true, whatsapp: true, wishlist: true },
  app: { minVersion: "1.0.0", latestVersion: "1.0.0", forceUpdate: false },
  notifications: {
    ORDER_PLACED: "Your order {code} has been placed. Total {total}.",
    QUOTE_SENT: "Quote for {code}: {amount}. Please review and approve.",
    PAYMENT_VERIFIED: "Payment of {amount} for {code} is verified. Thank you!",
    STATUS_CHANGED: "Order {code} is now {status}.",
    CHAT_REPLY: "Pipilika replied to your message.",
  },
};

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)?.[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v) ? merge(b, v) : v;
  }
  return out as T;
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await db.setting.findMany();
    const over: Record<string, unknown> = {};
    for (const r of rows) over[r.key] = r.value;
    return merge(DEFAULT_SETTINGS, over);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSetting(key: keyof SiteSettings, value: unknown) {
  await db.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } });
}

export const fillTemplate = (t: string, vars: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
