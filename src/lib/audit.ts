import { db } from "./db";

export async function audit(
  actor: { id: string; name: string } | null,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: unknown,
) {
  try {
    await db.auditLog.create({
      data: { actorId: actor?.id, actorName: actor?.name, action, entity, entityId: entityId ?? null, data: (data ?? undefined) as never },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
