import { Suspense } from "react";
import type { ReactNode } from "react";
import { AtSign, Building2, ChevronDown, KeyRound, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getStaff } from "@/lib/services/staff";
import { hasPermission } from "@/lib/permissions";
import { StaffFormModal } from "@/components/teachers/staff-form";
import { StaffFilterForm } from "@/components/staff/staff-filter-form";
import { createClient } from "@/lib/supabase/server";
import { StaffSalaryForm } from "@/components/staff/staff-salary-form";
import { OtherStaffFormModal } from "@/components/staff/other-staff-form";
import { OtherStaffSalaryForm } from "@/components/staff/other-staff-salary-form";
import { ButtonLink } from "@/components/ui/button";
import { OTHER_STAFF_CATEGORY_LABELS, type OtherStaffCategory } from "@/lib/constants/staff";

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  student_staff: "Registrar / Student Staff",
  staff: "Staff",
  cashier: "Cashier",
  head_teacher: "Teacher",
  other: "Others"
};

function getRoleLabel(role: string, customRoleName?: string | null, otherCategory?: OtherStaffCategory | null): string {
  if (role === "other") return otherCategory ? OTHER_STAFF_CATEGORY_LABELS[otherCategory] : "Others";
  if (customRoleName) return customRoleName;
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export default async function StaffPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser("staff:view");
  const supabase = await createClient();
  const { data: customRoles } = await supabase
    .from("custom_roles")
    .select("id,name")
    .eq("school_id", user.schoolId)
    .order("name");

  const staff = await getStaff(user, params.role ?? "all", params.q ?? "");
  const canManageSalary = user.role === "administrator" || user.role === "principal";
  const { data: salaryRows } = canManageSalary ? await supabase.from("teacher_employment_details").select("teacher_id,monthly_salary").eq("school_id", user.schoolId) : { data: [] };
  const salaryByStaff = new Map((salaryRows ?? []).map((row: any) => [row.teacher_id, Number(row.monthly_salary)]));
  const canCreateUsers = hasPermission(user.role, "teachers:manage", user.permissions);
  const allowedRoles =
    user.role === "administrator"
      ? (["teacher", "staff", "student_staff", "cashier"] as const)
      : user.role === "principal"
        ? (["administrator", "teacher", "staff", "student_staff", "cashier"] as const)
        : (["teacher", "staff", "student_staff", "cashier"] as const);

  return (
    <>
      <PageHeader
        eyebrow="School Directory"
        title="Staff"
        description="View all staff profiles, departments, roles, statuses, and class assignment summaries."
        actions={canCreateUsers ? (
          <div className="flex flex-wrap justify-end gap-2">
            <StaffFormModal allowedRoles={[...allowedRoles]} triggerLabel="Add Account Staff" />
            <OtherStaffFormModal />
          </div>
        ) : null}
      />

      <Card className="mb-5 p-4">
        <Suspense>
          <StaffFilterForm customRoles={customRoles ?? []} />
        </Suspense>
      </Card>

      {!staff.length ? (
        <EmptyState
          title="No staff found"
          description="Try a different search or role filter, or invite new staff from Settings."
        />
      ) : (
        <div className="grid gap-3">
          {staff.map((member: any) => (
            <details key={member.member_id} className="group overflow-hidden rounded-[18px] bg-white shadow-card ring-1 ring-outline/70">
              <summary className="grid cursor-pointer gap-4 px-5 py-4 transition hover:bg-surface-low md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone={member.is_record_only ? "gray" : "blue"}>{getRoleLabel(member.role, member.custom_role_name, member.other_category)}</Badge>
                    {member.is_record_only ? <Badge tone="yellow">Record only</Badge> : null}
                    <Badge tone={member.status === "active" ? "green" : "gray"}>{member.status}</Badge>
                    {member.must_change_password ? <Badge tone="yellow">Password reset</Badge> : null}
                  </div>
                  <h2 className="truncate font-display text-lg font-semibold text-ink">{member.full_name}</h2>
                  {member.email ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{member.email}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Others / record-only staff</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-sm font-semibold text-muted">
                    {member.assigned_classes ?? 0} assigned class{Number(member.assigned_classes ?? 0) === 1 ? "" : "es"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" aria-hidden="true" />
                </div>
              </summary>

              <div className="grid gap-5 border-t border-outline/60 p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <StaffInfo icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={getRoleLabel(member.role, member.custom_role_name, member.other_category)} />
                  <StaffInfo icon={<Building2 className="h-4 w-4" />} label="Department" value={[member.department, member.job_title].filter(Boolean).join(" / ") || "Not set"} />
                  <StaffInfo icon={<Phone className="h-4 w-4" />} label="Phone" value={member.phone || "Not provided"} />
                  <StaffInfo icon={<Users className="h-4 w-4" />} label="Assigned Classes" value={String(member.assigned_classes ?? 0)} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm">
                    <p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-muted">Contact</p>
                    {member.email ? (
                      <p className="flex items-center gap-2 font-semibold text-ink">
                        <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="truncate">{member.email}</span>
                      </p>
                    ) : <p className="font-semibold text-ink">No account or email required</p>}
                    {member.personal_email ? (
                      <p className="mt-2 flex items-center gap-2 text-muted">
                        <AtSign className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="truncate">{member.personal_email}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm">
                    <p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-muted">Account</p>
                    <p className="flex items-center gap-2 text-muted">
                      <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>{member.is_record_only ? "Record only; no login access" : member.must_change_password ? "Must change password on next login" : "Password is active"}</span>
                    </p>
                  </div>
                  {canManageSalary && member.is_record_only ? (
                    <OtherStaffSalaryForm staffId={member.member_id} initialSalary={member.monthly_salary} />
                  ) : canManageSalary ? (
                    <StaffSalaryForm staffId={member.user_id} initialSalary={salaryByStaff.get(member.user_id)} />
                  ) : null}
                </div>
                {!member.is_record_only ? <div className="flex justify-end"><ButtonLink href={`/staff/${member.user_id}`} variant="secondary" size="sm">View full profile</ButtonLink></div> : null}
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}

function StaffInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm">
      <div className="mb-1 flex items-center gap-1.5 text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="truncate font-semibold text-ink">{value}</p>
    </div>
  );
}
