import { db } from "@/lib/db";

/** WhatsApp Cloud API webhook: verification + inbound messages -> unified chat inbox. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_VERIFY_TOKEN)
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  if (!process.env.WHATSAPP_TOKEN) return new Response(null, { status: 204 });
  try {
    const j = await req.json();
    for (const entry of j.entry ?? [])
      for (const ch of entry.changes ?? []) {
        const contacts = ch.value?.contacts ?? [];
        for (const m of ch.value?.messages ?? []) {
          const phone = "0" + String(m.from).replace(/^880/, "");
          const name = contacts.find((c: any) => c.wa_id === m.from)?.profile?.name ?? phone;
          let conv = await db.conversation.findFirst({ where: { channel: "WHATSAPP", guestPhone: phone, status: { not: "RESOLVED" } } });
          const customer = await db.user.findUnique({ where: { phone } });
          if (!conv) conv = await db.conversation.create({ data: { channel: "WHATSAPP", guestPhone: phone, guestName: name, customerId: customer?.id } });
          await db.message.create({ data: { conversationId: conv.id, senderType: "CUSTOMER", senderName: name, body: m.text?.body ?? `(${m.type} message)` } });
          await db.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date(), status: "OPEN" } });
        }
      }
  } catch (e) {
    console.error("whatsapp webhook", e);
  }
  return new Response(null, { status: 200 });
}
