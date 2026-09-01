import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getStaff } from "@/lib/services/staff";
import { getRolePermissions } from "@/lib/permissions";
import { StaffFormModal } from "@/components/teachers/staff-form";

export default async function AdminPage() {
  const user = await requireUser("users:manage");
  const members = (await getStaff(user)).filter((member: any) =>
    user.role === "principal" ? true : member.role !== "principal" && member.role !== "administrator"
  );
  const allowedRoles =
    user.role === "principal"
      ? (["administrator", "teacher", "head_teacher", "staff", "student_staff", "cashier"] as const)
      : (["teacher", "head_teacher", "staff", "student_staff", "cashier"] as const);
  const visibleRoleCards =
    user.role === "principal"
      ? (["administrator", "principal", "teacher", "head_teacher", "student_staff", "staff", "cashier"] as const)
      : (["teacher", "head_teacher", "student_staff", "staff", "cashier"] as const);

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Administrator Console"
        description="Manage user membership, role policy, and school-level settings without exposing service-role credentials."
        actions={<StaffFormModal allowedRoles={[...allowedRoles]} triggerLabel="Add User" />}
      />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
            <Badge tone="blue">{members.length} members</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="font-label text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Department</th>
                    <th className="py-3 pr-4">Phone</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.member_id} className="border-t border-outline/35">
                      <td className="py-3 pr-4">
                        <p className="font-semibold">{member.full_name}</p>
                        <p className="text-xs text-muted">{member.job_title ?? "No title"}</p>
                      </td>
                      <td className="py-3 pr-4">{member.email}</td>
                      <td className="py-3 pr-4">{member.role.replace("_", " ")}</td>
                      <td className="py-3 pr-4">{member.department ?? "Not set"}</td>
                      <td className="py-3 pr-4">{member.phone ?? "Not set"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge>{member.status}</Badge>
                          {member.must_change_password ? <Badge tone="yellow">Password reset</Badge> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleRoleCards.map((role) => (
              <div key={role} className="rounded-lg bg-surface-low p-4">
                <p className="font-semibold capitalize text-ink">{role.replace("_", " ")}</p>
                <p className="mt-1 text-sm text-muted">{getRolePermissions(role).join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
