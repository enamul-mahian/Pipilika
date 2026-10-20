import { getUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
export const GET = handler(async () => {
  const u = await getUser();
  return ok({ user: u ? { id: u.id, name: u.name, email: u.email, phone: u.phone, kind: u.kind, permissions: u.role?.permissions ?? [] } : null });
});
