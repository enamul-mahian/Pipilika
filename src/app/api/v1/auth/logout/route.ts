import { endSession } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
export const POST = handler(async () => { await endSession(); return ok(); });
