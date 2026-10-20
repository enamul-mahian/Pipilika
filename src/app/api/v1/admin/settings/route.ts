import { z } from "zod";
import { revalidatePath } from "next/cache";
import { handler, ok, requirePerm, body } from "@/lib/api";
import { DEFAULT_SETTINGS, getSettings, saveSetting, type SiteSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];
const S = z.object({ key: z.enum(KEYS as [keyof SiteSettings, ...(keyof SiteSettings)[]]), value: z.record(z.string(), z.any()) });

export const GET = handler(async () => {
  await requirePerm("site.manage");
  return ok(await getSettings());
});

export const POST = handler(async (req: Request) => {
  const s = await requirePerm("site.manage");
  const b = await body(req, S);
  await saveSetting(b.key, b.value);
  await audit(s, "settings.save", "setting", b.key, b.value);
  revalidatePath("/", "layout");
  return ok({ ok: true });
});
