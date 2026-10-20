import { z } from "zod";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { parseDataUrl, putFile } from "@/lib/providers/storage";
import { notifyStaff } from "@/lib/notify";

const COOKIE = "pp_chat";

async function current(create?: { name?: string; phone?: string; orderCode?: string }) {
  const s = await getSession();
  const c = await cookies();
  if (s) {
    let conv = await db.conversation.findFirst({ where: { customerId: s.uid, status: { not: "RESOLVED" } }, orderBy: { lastMessageAt: "desc" } });
    if (!conv && create) {
      const order = create.orderCode ? await db.order.findFirst({ where: { code: create.orderCode.toUpperCase(), userId: s.uid } }) : null;
      conv = await db.conversation.create({ data: { customerId: s.uid, orderId: order?.id } });
    }
    return { conv, name: s.name, senderId: s.uid };
  }
  const tok = c.get(COOKIE)?.value;
  let conv = tok ? await db.conversation.findUnique({ where: { guestToken: tok } }) : null;
  if (conv?.status === "RESOLVED" && create) conv = null;
  if (!conv && create) {
    if (!create.name || !create.phone) throw new ApiError(400, "Please enter your name and phone");
    const guestToken = crypto.randomBytes(16).toString("hex");
    const order = create.orderCode ? await db.order.findFirst({ where: { code: create.orderCode.toUpperCase(), phone: create.phone } }) : null;
    conv = await db.conversation.create({ data: { guestName: create.name, guestPhone: create.phone, guestToken, orderId: order?.id } });
    c.set(COOKIE, guestToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  }
  return { conv, name: conv?.guestName ?? "Guest", senderId: null };
}

export const GET = handler(async () => {
  const { conv } = await current();
  if (!conv) return ok({ conversation: null, messages: [] });
  const messages = await db.message.findMany({ where: { conversationId: conv.id }, orderBy: { createdAt: "asc" }, take: 200 });
  return ok({ conversation: { id: conv.id, status: conv.status }, messages: messages.map((m) => ({ id: m.id, senderType: m.senderType, senderName: m.senderName, body: m.body, hasFile: !!m.attachmentKey, fileKey: m.attachmentKey, at: m.createdAt })) });
});

const S = z.object({ action: z.enum(["start", "send"]), name: z.string().max(80).optional(), phone: z.string().max(20).optional(), orderCode: z.string().max(20).optional(), body: z.string().max(2000).optional(), file: z.string().max(12_000_000).optional() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, S);
  rateLimit(`chat:${await clientIp()}`, 40, 10 * 60_000);
  const { conv, name, senderId } = await current({ name: b.name, phone: b.phone, orderCode: b.orderCode });
  if (!conv) throw new ApiError(400, "Could not start chat");
  if (b.action === "send") {
    if (!b.body?.trim() && !b.file) throw new ApiError(400, "Type a message");
    let attachmentKey: string | null = null;
    if (b.file) { try { const f = parseDataUrl(b.file); attachmentKey = await putFile(f.buf, f.mime, "chat"); } catch (e) { throw new ApiError(400, (e as Error).message); } }
    await db.message.create({ data: { conversationId: conv.id, senderType: "CUSTOMER", senderId, senderName: name, body: b.body?.trim() || "(image)", attachmentKey } });
    await db.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date(), status: "OPEN" } });
    await notifyStaff("New chat message", `${name}: ${(b.body ?? "").slice(0, 80)}`, `/admin/chats/${conv.id}`);
  }
  return ok({ ok: true, conversationId: conv.id });
});
