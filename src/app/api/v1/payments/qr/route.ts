import QRCode from "qrcode";
import { getSettings } from "@/lib/settings";

/** Bangla QR image: the merchant QR uploaded in settings, or a clearly-marked demo QR. */
export async function GET() {
  const s = await getSettings();
  const custom = (s.payments as any).qrImage as string | undefined;
  if (custom) return Response.redirect(new URL(custom, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), 302);
  const svg = await QRCode.toString(`DEMO-BANGLA-QR:${s.store.name}:${s.store.phone}`, { type: "svg", margin: 1, color: { dark: "#2f1a15" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
}
