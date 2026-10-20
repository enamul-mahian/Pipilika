import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ApiError, body, handler, ok, requirePerm } from "@/lib/api";
import { audit } from "@/lib/audit";

const Block = z.object({ id: z.string(), type: z.string(), props: z.record(z.string(), z.any()) });
const S = z.object({
  action: z.enum(["create", "save", "publish", "unpublish", "delete"]),
  id: z.string().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, dashes").optional(),
  title: z.string().min(1).max(120).optional(),
  blocks: z.array(Block).max(60).optional(),
  showInMenu: z.boolean().optional(), seoTitle: z.string().max(120).nullable().optional(), seoDesc: z.string().max(300).nullable().optional(), ogImage: z.string().max(500).nullable().optional(), noindex: z.boolean().optional(),
});
const RESERVED = ["shop", "product", "cart", "checkout", "track", "o", "custom-cake", "gallery", "login", "account", "admin", "pos", "api", "print", "staff-login"];

export const POST = handler(async (req: Request) => {
  const s = await requirePerm("site.manage");
  const b = await body(req, S);
  if (b.action === "create") {
    if (!b.slug || !b.title) throw new ApiError(400, "Title and slug are required");
    if (RESERVED.includes(b.slug)) throw new ApiError(400, "That address is used by the system");
    if (await db.page.findUnique({ where: { slug: b.slug } })) throw new ApiError(400, "A page with that address exists");
    const p = await db.page.create({ data: { slug: b.slug, title: b.title, blocks: [{ id: "b1", type: "text", props: { title: b.title, body: "Write something here." } }] } });
    await audit(s, "page.create", "page", p.id, { slug: b.slug });
    return ok(p, 201);
  }
  const page = b.id ? await db.page.findUnique({ where: { id: b.id } }) : null;
  if (!page) throw new ApiError(404, "Page not found");
  if (b.action === "delete") {
    if (page.isSystem) throw new ApiError(400, "System pages cannot be deleted");
    await db.page.delete({ where: { id: page.id } });
  } else if (b.action === "save" || b.action === "publish") {
    const data: any = { title: b.title ?? page.title, showInMenu: b.showInMenu ?? page.showInMenu, seoTitle: b.seoTitle, seoDesc: b.seoDesc, ogImage: b.ogImage, noindex: b.noindex ?? page.noindex };
    if (b.blocks) data.blocks = b.blocks;
    if (b.action === "publish") Object.assign(data, { publishedBlocks: b.blocks ?? page.blocks, isPublished: true, publishedAt: new Date() });
    await db.page.update({ where: { id: page.id }, data });
  } else if (b.action === "unpublish") {
    if (page.slug === "home") throw new ApiError(400, "The home page must stay published");
    await db.page.update({ where: { id: page.id }, data: { isPublished: false } });
  }
  await audit(s, `page.${b.action}`, "page", page.id, { slug: page.slug });
  revalidatePath(page.slug === "home" ? "/" : `/${page.slug}`);
  return ok({ ok: true });
});
