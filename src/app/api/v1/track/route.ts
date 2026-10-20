import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/api";
const ALLOWED = new Set(["view_item", "search", "add_to_cart", "begin_checkout", "purchase", "custom_cake_started", "image_uploaded", "custom_design_submitted", "quote_received", "quote_accepted", "payment_started", "whatsapp_clicked", "chat_started"]);
/** First-party event log for marketing attribution reports. */
export async function POST(req: Request) {
  try {
    rateLimit(`trk:${await clientIp()}`, 120, 60_000);
    const j = JSON.parse(await req.text());
    if (ALLOWED.has(j.name)) await db.analyticsEvent.create({ data: { name: j.name, source: typeof j.source === "string" ? j.source.slice(0, 60) : null, data: j.data ?? undefined } });
  } catch {}
  return new Response(null, { status: 204 });
}
