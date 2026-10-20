import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getFile, mimeOf } from "@/lib/providers/storage";
import { fail } from "@/lib/api";

/** Serves stored files. Public folders (cms/, products/) are open; everything else needs staff, or the owner for chat files. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const key = (await ctx.params).key.join("/");
  const isPublic = key.startsWith("public/");
  if (!isPublic) {
    const s = await getSession();
    if (!s) return fail(401, "Login required");
    if (s.kind !== "STAFF" || !can(s.perms, "orders.view")) {
      const msg = await db.message.findFirst({ where: { attachmentKey: key, conversation: { customerId: s.uid } } });
      if (!msg) return fail(403, "Forbidden");
    }
  }
  const buf = await getFile(key);
  if (!buf) return fail(404, "Not found");
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": mimeOf(key), "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, max-age=600", "X-Content-Type-Options": "nosniff" } });
}
