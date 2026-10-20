import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Block } from "@/components/blocks";

/** Loads a CMS page. Staff can preview drafts with ?preview=1. */
export async function loadPage(slug: string, preview?: boolean) {
  const page = await db.page.findUnique({ where: { slug } });
  if (!page) return null;
  if (preview) {
    const s = await getSession();
    if (s?.kind === "STAFF") return { page, blocks: page.blocks as Block[], isPreview: true };
  }
  if (!page.isPublished) return null;
  return { page, blocks: (page.publishedBlocks ?? page.blocks) as Block[], isPreview: false };
}
