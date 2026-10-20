import { db } from "./db";
import { fillTemplate, getSettings } from "./settings";
import { emailSender, smsSender } from "./providers/messaging";

/** In-app notification + optional email/SMS fan-out through providers. */
export async function notifyUser(userId: string | null | undefined, template: string, vars: Record<string, string | number>, link?: string) {
  if (!userId) return;
  const s = await getSettings();
  const body = fillTemplate(s.notifications[template] ?? template, vars);
  const title = template.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
  await db.notification.create({ data: { userId, title, body, link } });
  const u = await db.user.findUnique({ where: { id: userId } });
  try {
    if (u?.email) await emailSender.send(u.email, `Pipilika: ${title}`, body);
    else if (u?.phone) await smsSender.send(u.phone, title, body);
  } catch (e) {
    console.error("notify send failed", e);
  }
}

export async function notifyStaff(title: string, body: string, link?: string) {
  const staff = await db.user.findMany({ where: { kind: "STAFF", isActive: true }, select: { id: true } });
  if (staff.length) await db.notification.createMany({ data: staff.map((s) => ({ userId: s.id, title, body, link })) });
}
