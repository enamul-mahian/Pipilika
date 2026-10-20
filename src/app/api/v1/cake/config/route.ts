import { loadDesignerConfig } from "@/lib/cake-config";
import { ok } from "@/lib/api";
export async function GET() { return ok(await loadDesignerConfig()); }
