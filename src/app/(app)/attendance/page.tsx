import { PageHeader } from "@/components/layout/page-header";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { AttendanceRegisterView } from "@/components/attendance/attendance-register-view";
import { TeacherAttendanceForm } from "@/components/attendance/teacher-attendance-form";
import { requireUser } from "@/lib/auth/session";
import { getAttendanceContext, getTeacherAttendanceContext, principalHasTeachingClass } from "@/lib/services/attendance";
import { getPendingAttendanceClasses } from "@/lib/services/dashboard";
import { hasPermission } from "@/lib/permissions";
import { submitAttendanceAction, submitTeacherAttendanceAction } from "@/app/(app)/attendance/actions";
import { PendingAttendanceCard } from "@/components/dashboard/pending-attendance-card";
import { ButtonLink } from "@/components/ui/button";
import { BriefcaseBusiness, CalendarDays, House } from "lucide-react";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("attendance:view");
  const today = new Date().toISOString().slice(0, 10);
  const canManageTeacherAttendance = user.role === "administrator" || user.role === "principal";
  const teacherAttendanceView = canManageTeacherAttendance && params.view === "teachers";
  const wantsClassMode = params.mode === "class";
  const [hasTeachingClass, pendingAttendanceClasses] = await Promise.all([
    principalHasTeachingClass(user),
    user.role === "principal" && !teacherAttendanceView ? getPendingAttendanceClasses(user) : Promise.resolve([])
  ]);
  const mode = user.role === "principal" && wantsClassMode && hasTeachingClass ? "class" : "school";
  const [context, teacherContext] = teacherAttendanceView
    ? [null, await getTeacherAttendanceContext(user, params.date)]
    : [await getAttendanceContext(user, params.classId, params.date, { scope: mode }), null];
  const selectedClass = context?.classes.find((item) => item.id === context.selectedClassId);
  const canOpenMarkingForm = hasPermission(user.role, "attendance:submit", user.permissions) || (user.role === "principal" && mode === "class");
  const datedQuery = params.date ? `&date=${encodeURIComponent(params.date)}` : "";
  const studentDateQuery = params.date ? `?date=${encodeURIComponent(params.date)}` : "";

  return (
    <>
      <PageHeader
        eyebrow="Daily workflow"
        title={teacherAttendanceView ? "Teacher Attendance" : "Attendance"}
        description={teacherAttendanceView ? "Mark daily attendance for active teachers and head teachers." : canOpenMarkingForm ? "Choose a date and class, mark the roster, and submit attendance once for that class and day." : "Review submitted attendance by class and date."}
      />
      {canManageTeacherAttendance ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <ButtonLink
            href={`/attendance${studentDateQuery}`}
            variant={!teacherAttendanceView && mode === "school" ? "primary" : "secondary"}
            size="sm"
            className="min-h-12 rounded-2xl px-5 text-sm"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            School Register
          </ButtonLink>
          {user.role === "principal" && hasTeachingClass ? (
            <ButtonLink
              href={`/attendance?mode=class${datedQuery}`}
              variant={!teacherAttendanceView && mode === "class" ? "primary" : "secondary"}
              size="sm"
              className="min-h-12 rounded-2xl px-5 text-sm"
            >
              <House className="h-4 w-4" aria-hidden="true" />
              My Class
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={`/attendance?view=teachers${datedQuery}`}
            variant={teacherAttendanceView ? "primary" : "secondary"}
            size="sm"
            className="min-h-12 rounded-2xl px-5 text-sm"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            Teacher Attendance
          </ButtonLink>
        </div>
      ) : null}
      {teacherAttendanceView && teacherContext ? (
        <TeacherAttendanceForm
          teachers={teacherContext.teachers}
          attendanceDate={teacherContext.attendanceDate}
          submitted={teacherContext.submitted}
          migrationRequired={teacherContext.migrationRequired}
          onSubmit={submitTeacherAttendanceAction}
        />
      ) : canOpenMarkingForm ? (
        <AttendanceForm
          classes={context!.classes}
          roster={context!.roster}
          selectedClassId={context!.selectedClassId}
          attendanceDate={context!.attendanceDate}
          submitted={Boolean(context!.session)}
          canSubmit={Boolean(selectedClass?.can_mark_attendance) && !context!.session}
          restrictionMessage={selectedClass && !selectedClass.can_mark_attendance ? "Only the head teacher can mark attendance." : null}
          onSubmit={submitAttendanceAction}
        />
      ) : (
        <AttendanceRegisterView
          classes={context!.classes}
          roster={context!.roster}
          selectedClassId={context!.selectedClassId}
          attendanceDate={context!.attendanceDate}
          submitted={Boolean(context!.session)}
        />
      )}
      {user.role === "principal" && !teacherAttendanceView && mode === "school" ? (
        <section className="mt-6">
          <PendingAttendanceCard classes={pendingAttendanceClasses} today={today} />
        </section>
      ) : null}
    </>
  );
}
