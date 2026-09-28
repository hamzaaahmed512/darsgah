import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { getStaff } from "@/lib/services/staff";
import { StaffFormModal } from "@/components/teachers/staff-form";
import { createClient } from "@/lib/supabase/server";
import { CreateRoleModal, DeleteUserButton, EditUserModal } from "@/components/admin/admin-role-modals";
import { Search, ShieldCheck } from "lucide-react";
import { StudentPagination } from "@/components/students/student-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { paginateRows } from "@/lib/pagination";

const statusTone = {
  active: "green",
  inactive: "yellow",
  disabled: "red"
} as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("users:manage");
  const supabase = await createClient();
  const permittedMembers = (await getStaff(user)).filter((member: any) =>
    user.role === "principal" ? true : member.role !== "principal" && member.role !== "administrator"
  );
  const query = (params.q ?? "").trim().toLowerCase();
  const status = ["active", "inactive", "disabled"].includes(params.status ?? "") ? params.status! : "all";
  const filteredMembers = permittedMembers.filter((member: any) => {
    const matchesQuery = !query || [member.full_name, member.email, member.job_title, member.department, member.phone, member.custom_role_name, member.role]
      .some((value) => String(value ?? "").toLowerCase().includes(query));
    const matchesStatus = status === "all" || member.status === status;
    return matchesQuery && matchesStatus;
  });
  const members = paginateRows(filteredMembers, params.page, params.pageSize);
  const allowedRoles =
    user.role === "principal"
      ? (["administrator", "teacher", "staff", "student_staff", "cashier", "librarian"] as const)
      : (["teacher", "staff", "student_staff", "cashier", "librarian"] as const);
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
            <StaffFormModal allowedRoles={[...allowedRoles]} customRoles={customRoles} triggerLabel="Add User" wider />
            {user.role === "principal" ? <ButtonLink href="/admin/roles" variant="secondary">View Roles</ButtonLink> : null}
            <CreateRoleModal currentUserRole={user.role} />
          </div>
        }
      />
      <section className="grid gap-6">
        <Card className="rounded-[28px] border border-outline/70 bg-white p-4 shadow-card">
          <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.35fr)_auto]">
            <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input name="q" defaultValue={params.q ?? ""} placeholder="Search name, email, role, or department..." className="h-12 rounded-2xl border-outline/70 pl-11 shadow-none" /></div>
            <Select name="status" defaultValue={status} className="h-12 rounded-2xl border-outline/70 shadow-none"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="disabled">Disabled</option></Select>
            <Button type="submit" className="min-h-12 rounded-2xl px-7">Filter</Button>
          </form>
        </Card>

        <Card className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />User Accounts</h2>
            <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{members.count} members</span>
          </div>
          <CardContent className="p-0">
            {!members.rows.length ? <EmptyState title="No user accounts found" description="Try changing the search or status filter." className="m-5" /> : <>
              <div className="admin-table-scroll hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.rows.map((member: any) => (
                    <tr key={member.member_id} className="border-t border-slate-100 transition hover:bg-blue-50/30">
                      <td className="px-6 py-5">
                        <p className="font-semibold">{member.full_name}</p>
                        <p className="text-xs text-muted">{member.job_title ?? "No title"}</p>
                      </td>
                      <td className="px-6 py-5">{member.email}</td>
                      <td className="px-6 py-5 capitalize">{member.custom_role_name ?? member.role.replace("_", " ")}</td>
                      <td className="px-6 py-5">{member.department ?? "Not set"}</td>
                      <td className="px-6 py-5">{member.phone ?? "Not set"}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={statusTone[member.status as keyof typeof statusTone] ?? "gray"}>{member.status}</Badge>
                          {member.must_change_password ? <Badge tone="yellow">Password reset</Badge> : null}
                        </div>
                      </td>
                      <td className="px-6 py-5">
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
              <div className="grid gap-3 p-4 lg:hidden">
                {members.rows.map((member: any) => (
                  <article key={member.member_id} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{member.full_name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div>
                      <Badge tone={statusTone[member.status as keyof typeof statusTone] ?? "gray"}>{member.status}</Badge>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="min-w-0 text-xs text-slate-500"><p className="truncate capitalize">{member.custom_role_name ?? member.role.replace("_", " ")}</p><p className="mt-1 truncate">{member.department ?? "No department"}</p></div>
                      {canManageMember(user.role, member.role) ? <div className="flex shrink-0 gap-2"><EditUserModal currentUserRole={user.role} member={member} customRoles={customRoles} /><DeleteUserButton memberId={member.member_id} memberName={member.full_name} /></div> : null}
                    </div>
                  </article>
                ))}
              </div>
            </>}
          </CardContent>
          <StudentPagination count={members.count} page={members.page} pageSize={members.pageSize} itemLabel="members" />
        </Card>
      </section>
    </>
  );
}

function canManageMember(currentUserRole: string, memberRole: string) {
  if (currentUserRole === "principal") return memberRole !== "principal";
  return memberRole !== "principal" && memberRole !== "administrator";
}
