import { PageHeader } from "@/components/layout/page-header";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { AttendanceRegisterView } from "@/components/attendance/attendance-register-view";
import { requireUser } from "@/lib/auth/session";
import { getAttendanceContext } from "@/lib/services/attendance";
import { getPendingAttendanceClasses } from "@/lib/services/dashboard";
import { hasPermission } from "@/lib/permissions";
import { submitAttendanceAction } from "@/app/(app)/attendance/actions";
import { PendingAttendanceCard } from "@/components/dashboard/pending-attendance-card";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("attendance:view");
  const today = new Date().toISOString().slice(0, 10);
  const [context, pendingAttendanceClasses] = await Promise.all([
    getAttendanceContext(user, params.classId, params.date),
    user.role === "principal" ? getPendingAttendanceClasses(user) : Promise.resolve([])
  ]);
  const selectedClass = context.classes.find((item) => item.id === context.selectedClassId);
  const canOpenMarkingForm = hasPermission(user.role, "attendance:submit", user.permissions);

  return (
    <>
      <PageHeader
        eyebrow="Daily workflow"
        title="Attendance"
        description={canOpenMarkingForm ? "Choose a date and class, mark the roster, and submit attendance once for that class and day." : "Review submitted attendance by class and date."}
      />
      {canOpenMarkingForm ? (
        <AttendanceForm
          classes={context.classes}
          roster={context.roster}
          selectedClassId={context.selectedClassId}
          attendanceDate={context.attendanceDate}
          submitted={Boolean(context.session)}
          canSubmit={Boolean(selectedClass?.can_mark_attendance) && !context.session}
          restrictionMessage={selectedClass && !selectedClass.can_mark_attendance ? "Only the head teacher can mark attendance." : null}
          onSubmit={submitAttendanceAction}
        />
      ) : (
        <AttendanceRegisterView
          classes={context.classes}
          roster={context.roster}
          selectedClassId={context.selectedClassId}
          attendanceDate={context.attendanceDate}
          submitted={Boolean(context.session)}
        />
      )}
      {user.role === "principal" ? (
        <section className="mt-6">
          <PendingAttendanceCard classes={pendingAttendanceClasses} today={today} />
        </section>
      ) : null}
    </>
  );
}
