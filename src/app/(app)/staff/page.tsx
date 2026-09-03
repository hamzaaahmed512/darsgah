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
import { StaffFilterForm } from "@/components/staff/staff-filter-form";
import { createClient } from "@/lib/supabase/server";
import { StaffCreateModal } from "@/components/staff/staff-create-modal";
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
        actions={canCreateUsers ? <StaffCreateModal allowedRoles={[...allowedRoles]} customRoles={customRoles ?? []} /> : null}
      />

      <Card className="mb-5 rounded-[28px] border border-outline/70 bg-white p-4 shadow-card">
        <Suspense>
          <StaffFilterForm customRoles={customRoles ?? []} />
        </Suspense>
      </Card>

      {!staff.length ? (
        <EmptyState
          title="No staff found"
          description="Try a different search or role filter, or add a new staff record from this page."
        />
      ) : (
        <div className="grid gap-4">
          {staff.map((member: any) => (
            <details key={member.member_id} className="group overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-card">
              <summary className="grid cursor-pointer gap-4 px-5 py-5 transition hover:bg-surface-low/60 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:px-6">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ${getAvatarToneClasses(member.full_name, member.status)}`}>
                  {getInitials(member.full_name)}
                </div>
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge tone={member.is_record_only ? "gray" : "blue"}>{getRoleLabel(member.role, member.custom_role_name, member.other_category)}</Badge>
                    <Badge tone={member.status === "active" ? "green" : "gray"}>{member.status}</Badge>
                    {member.is_record_only ? <Badge tone="yellow">Record only</Badge> : null}
                    {member.must_change_password ? <Badge tone="yellow">Password reset</Badge> : null}
                  </div>
                  <h2 className="truncate font-display text-[1.25rem] font-bold leading-tight text-ink sm:text-[1.4rem]">{member.full_name}</h2>
                  {member.email ? (
                    <p className="mt-3 flex items-center gap-2 text-base text-muted">
                      <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{member.email}</span>
                    </p>
                  ) : (
                    <p className="mt-3 text-base text-muted">Others / record-only staff</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 self-start md:self-center">
                  <span className="text-sm font-semibold text-muted md:text-base">
                    {member.assigned_classes ?? 0} assigned class{Number(member.assigned_classes ?? 0) === 1 ? "" : "es"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" aria-hidden="true" />
                </div>
              </summary>

              <div className="grid gap-4 border-t border-outline/60 px-5 py-5 md:px-6">
                <div className="grid gap-3 md:grid-cols-4">
                  <StaffInfo icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={getRoleLabel(member.role, member.custom_role_name, member.other_category)} />
                  <StaffInfo icon={<Building2 className="h-4 w-4" />} label="Department" value={[member.department, member.job_title].filter(Boolean).join(" / ") || "Not set"} />
                  <StaffInfo icon={<Phone className="h-4 w-4" />} label="Phone" value={member.phone || "Not provided"} />
                  <StaffInfo icon={<Users className="h-4 w-4" />} label="Assigned Classes" value={String(member.assigned_classes ?? 0)} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border border-outline/50 bg-white p-5 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <p className="mb-3 font-label text-xs font-bold uppercase tracking-wide text-muted">Contact</p>
                    {member.email ? (
                      <p className="flex items-center gap-2 text-base font-semibold text-ink">
                        <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="truncate">{member.email}</span>
                      </p>
                    ) : <p className="text-base font-semibold text-ink">No account or email required</p>}
                    {member.personal_email ? (
                      <p className="mt-3 flex items-center gap-2 text-muted">
                        <AtSign className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="truncate">{member.personal_email}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[22px] border border-outline/50 bg-white p-5 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <p className="mb-3 font-label text-xs font-bold uppercase tracking-wide text-muted">Account</p>
                    <p className="flex items-center gap-2 text-base text-muted">
                      <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className={member.is_record_only || member.must_change_password ? "" : "font-semibold text-success"}>
                        {member.is_record_only ? "Record only; no login access" : member.must_change_password ? "Must change password on next login" : "Password is active"}
                      </span>
                    </p>
                  </div>
                </div>
                {!member.is_record_only ? <div className="flex justify-end"><ButtonLink href={`/staff/${member.user_id}`} variant="secondary" size="sm" className="min-w-[152px] justify-center rounded-2xl">View full profile</ButtonLink></div> : null}
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
    <div className="rounded-[22px] border border-outline/50 bg-white p-5 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarToneClasses(fullName: string, status: string) {
  if (status !== "active") return "bg-slate-100 text-slate-500";
  const tones = [
    "bg-blue-50 text-blue-600",
    "bg-emerald-50 text-emerald-600",
    "bg-violet-50 text-violet-600",
    "bg-amber-50 text-amber-600"
  ];
  const hash = [...fullName].reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
