import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { notifyUser } from "@/lib/notify";
import { whatsappSender } from "@/lib/providers/messaging";

type Ctx = { params: Promise<{ id: string }> };
const S = z.object({ action: z.enum(["reply", "status"]), body: z.string().max(2000).optional(), status: z.enum(["OPEN", "WAITING", "RESOLVED"]).optional(), whatsapp: z.boolean().optional() });

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requirePerm("chat.use");
  const { id } = await ctx.params;
  const messages = await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  return ok({ messages });
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const s = await requirePerm("chat.use");
  const { id } = await ctx.params;
  const b = await body(req, S);
  const conv = await db.conversation.findUnique({ where: { id }, include: { customer: true } });
  if (!conv) throw new ApiError(404, "Conversation not found");
  if (b.action === "status") {
    await db.conversation.update({ where: { id }, data: { status: b.status } });
    return ok({ ok: true });
  }
  const text = b.body?.trim();
  if (!text) throw new ApiError(400, "Type a reply");
  await db.message.create({ data: { conversationId: id, senderType: "STAFF", senderId: s.id, senderName: s.name, body: text } });
  await db.conversation.update({ where: { id }, data: { lastMessageAt: new Date(), status: "WAITING" } });
  const phone = conv.customer?.phone ?? conv.guestPhone;
  if ((b.whatsapp || conv.channel === "WHATSAPP") && phone) await whatsappSender.send(phone, "Pipilika", text);
  await notifyUser(conv.customerId, "CHAT_REPLY", {}, "/account");
  return ok({ ok: true });
});
