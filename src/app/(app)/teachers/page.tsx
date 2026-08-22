import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getStaff } from "@/lib/services/staff";
import { StaffFormModal } from "@/components/teachers/staff-form";
import { ButtonLink } from "@/components/ui/button";

export default async function TeachersPage() {
  const user = await requireUser("teachers:manage");
  
  // Principal can see teachers and student_staff
  const allStaff = await getStaff(user);
  const managedStaff = allStaff.filter((s: any) => s.role === "teacher" || s.role === "student_staff");

  return (
    <>
      <PageHeader 
        eyebrow="Staff" 
        title="Teacher & Staff Management" 
        description="Manage teaching and administrative staff accounts, statuses, and class assignments."
        actions={<StaffFormModal allowedRoles={["teacher", "student_staff"]} triggerLabel="Add User" />}
      />

      <div className="grid gap-6">
        {managedStaff.map((member: any) => (
          <Card key={member.member_id} className="overflow-hidden">
            <div className="h-1.5 bg-primary" />
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{member.full_name}</CardTitle>
                  <p className="mt-1 text-sm text-muted">{member.email}</p>
                </div>
                <Badge tone={member.status === "active" ? "green" : "gray"}>
                  {member.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Role & Details</p>
                  <p className="mt-1 text-sm text-ink"><span className="font-semibold">Role:</span> {member.role.replace("_", " ")}</p>
                  <p className="mt-1 text-sm text-ink"><span className="font-semibold">Department:</span> {member.department ?? "None"}</p>
                  <p className="mt-1 text-sm text-ink"><span className="font-semibold">Title:</span> {member.job_title ?? "None"}</p>
                  <p className="mt-1 text-sm text-ink"><span className="font-semibold">Phone:</span> {member.phone ?? "None"}</p>
                  {member.bio ? <p className="mt-3 rounded-lg bg-surface-low p-3 text-sm leading-6 text-muted">{member.bio}</p> : null}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Class Assignments</p>
                  <p className="mt-1 text-sm text-ink">Assigned to {member.assigned_classes ?? 0} classes.</p>
                  {/* Class assignment forms/UI would go here */}
                </div>
              </div>
              <div className="mt-4 flex justify-end"><ButtonLink href={`/staff/${member.user_id}`} variant="secondary" size="sm">View full profile</ButtonLink></div>
            </CardContent>
          </Card>
        ))}
        {managedStaff.length === 0 && (
          <div className="p-8 text-center text-muted card-surface rounded-lg">
            No manageable staff found.
          </div>
        )}
      </div>
    </>
  );
}
