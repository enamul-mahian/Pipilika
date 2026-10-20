import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";
import { Crud } from "@/components/crud";
import { StaffEditor } from "@/components/admin-staff";

export default async function Staff() {
  const [staff, roles] = await Promise.all([
    db.user.findMany({ where: { kind: "STAFF" }, orderBy: { createdAt: "asc" }, include: { role: true, logins: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    db.role.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Staff & roles</h1>
      <StaffEditor roles={roles.map((r) => ({ id: r.id, name: r.name }))} staff={staff.map((s) => ({ id: s.id, name: s.name, email: s.email ?? "", phone: s.phone ?? "", roleId: s.roleId ?? "", role: s.role?.name ?? "", isActive: s.isActive, lastLogin: s.logins[0] ? fmtDate(s.logins[0].createdAt, true) : "never" }))} />
      <Crud resource="roles" title="Roles & permissions" rows={roles} canDelete={false} fields={[{ key: "name", label: "Role", required: true }, { key: "permissions", label: "Permissions (comma separated, * = all)", type: "tags" }]} />
      <div className="card p-4 text-xs text-muted"><b className="text-ink">Available permissions:</b> {Object.entries(PERMISSIONS).map(([k, v]) => <span key={k} className="mr-3 inline-block"><code className="text-brand">{k}</code> {v}</span>)}</div>
    </div>
  );
}
