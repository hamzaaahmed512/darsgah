import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getStaff } from "@/lib/services/staff";
import { StaffFormModal } from "@/components/teachers/staff-form";
import { createClient } from "@/lib/supabase/server";
import { CreateRoleModal, DeleteUserButton, EditUserModal } from "@/components/admin/admin-role-modals";
import { ShieldCheck } from "lucide-react";

const statusTone = {
  active: "green",
  inactive: "yellow",
  disabled: "red"
} as const;

export default async function AdminPage() {
  const user = await requireUser("users:manage");
  const supabase = await createClient();
  const members = (await getStaff(user)).filter((member: any) =>
    user.role === "principal" ? true : member.role !== "principal" && member.role !== "administrator"
  );
  const allowedRoles =
    user.role === "principal"
      ? (["administrator", "teacher", "staff", "student_staff", "cashier"] as const)
      : (["teacher", "staff", "student_staff", "cashier"] as const);
  const { data: customRolesData } = await supabase.from("custom_roles").select("*").eq("school_id", user.schoolId).order("name");
  const customRoles = customRolesData ?? [];

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Administrator Console"
        description="Manage user membership, role policy, and school-level settings without exposing service-role credentials."
        actions={
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <StaffFormModal allowedRoles={[...allowedRoles]} customRoles={customRoles} triggerLabel="Add User" />
            <CreateRoleModal currentUserRole={user.role} />
          </div>
        }
      />
      <section className="grid gap-6">
        <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
          <CardHeader className="gap-4 border-b border-outline/50 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-[1.5rem]">User Accounts</CardTitle>
                <p className="mt-1 text-sm text-muted">Manage account roles, access status, and membership records.</p>
              </div>
            </div>
            <Badge tone="blue" className="rounded-full px-3 py-1.5 text-xs font-bold">{members.length} members</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[24px] border border-outline/50">
              <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50/80 font-label text-xs uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Phone</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.member_id} className="border-t border-outline/35">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{member.full_name}</p>
                        <p className="text-xs text-muted">{member.job_title ?? "No title"}</p>
                      </td>
                      <td className="px-5 py-4">{member.email}</td>
                      <td className="px-5 py-4">{member.custom_role_name ?? member.role.replace("_", " ")}</td>
                      <td className="px-5 py-4">{member.department ?? "Not set"}</td>
                      <td className="px-5 py-4">{member.phone ?? "Not set"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={statusTone[member.status as keyof typeof statusTone] ?? "gray"}>{member.status}</Badge>
                          {member.must_change_password ? <Badge tone="yellow">Password reset</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {canManageMember(user.role, member.role) ? (
                          <div className="flex justify-end gap-2">
                            <EditUserModal currentUserRole={user.role} member={member} customRoles={customRoles} />
                            <DeleteUserButton memberId={member.member_id} memberName={member.full_name} />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function canManageMember(currentUserRole: string, memberRole: string) {
  if (currentUserRole === "principal") return memberRole !== "principal";
  return memberRole !== "principal" && memberRole !== "administrator";
}
