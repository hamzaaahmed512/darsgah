import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRolePermissions } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

const defaultRoleNames: Record<UserRole, string> = {
  principal: "Principal", administrator: "Administrator", teacher: "Teacher", head_teacher: "Head Teacher", student_staff: "Student-management Staff", staff: "Staff", cashier: "Cashier", librarian: "Librarian"
};

export default async function RolesPage() {
  const user = await requireUser("users:manage");
  if (user.role !== "principal") throw new Error("Only the principal can view custom roles.");
  const db = await createClient();
  const { data: rolesData } = await db.from("custom_roles").select("id,name,base_role").eq("school_id", user.schoolId).order("name");
  const roles = rolesData ?? [];
  const { data: permissionsData } = roles.length ? await db.from("role_permissions").select("role_key,permission,granted").eq("school_id", user.schoolId).in("role_key", roles.map((role) => role.id)) : { data: [] };
  const permissionsByRole = new Map<string, string[]>();
  for (const permission of permissionsData ?? []) {
    if (!permission.granted) continue;
    permissionsByRole.set(permission.role_key, [...(permissionsByRole.get(permission.role_key) ?? []), permission.permission]);
  }
  const defaultRoles = (Object.keys(defaultRoleNames) as UserRole[]).map((role) => ({ id: `default:${role}`, name: defaultRoleNames[role], type: "Default", baseRole: "—", permissions: getRolePermissions(role) }));
  const customRoleRows = roles.map((role) => ({ id: role.id, name: role.name, type: "Custom", baseRole: role.base_role.replaceAll("_", " "), permissions: permissionsByRole.get(role.id) ?? [] }));
  const allRoles = [...defaultRoles, ...customRoleRows];

  return <>
    <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to Admin Console</Link>
    <PageHeader eyebrow="System" title="Roles" description="Review the built-in and custom roles configured for this school." />
    <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
      <CardHeader className="gap-4 border-b border-outline/50 pb-4"><div className="flex items-start gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary"><ShieldCheck className="h-5 w-5" /></div><div><CardTitle className="text-[1.5rem]">Existing roles</CardTitle><p className="mt-1 text-sm text-muted">Default roles are built in. Custom roles inherit their base role and include their listed permissions.</p></div></div></CardHeader>
      <CardContent className="pt-6"><div className="overflow-x-auto rounded-2xl border border-outline/60"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50/80 font-label text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-5 py-4">Role</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Base role</th><th className="px-5 py-4">Permissions</th></tr></thead><tbody>{allRoles.map((role) => <tr key={role.id} className="border-t border-outline/50"><td className="px-5 py-4 font-semibold text-ink">{role.name}</td><td className="px-5 py-4"><Badge tone={role.type === "Default" ? "blue" : "green"}>{role.type}</Badge></td><td className="px-5 py-4">{role.baseRole === "—" ? "—" : <Badge tone="gray">{role.baseRole}</Badge>}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{role.permissions.length ? role.permissions.map((permission) => <Badge key={permission} tone="gray">{permission}</Badge>) : <span className="text-muted">No extra permissions</span>}</div></td></tr>)}</tbody></table></div></CardContent>
    </Card>
  </>;
}
