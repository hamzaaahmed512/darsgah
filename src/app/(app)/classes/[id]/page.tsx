import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, GraduationCap, MapPin, Users } from "lucide-react";
import { ClassFormModal } from "@/components/classes/class-form";
import { ClassSubjectManager } from "@/components/classes/ClassSubjectManager";
import { TeacherAssignmentModal } from "@/components/classes/TeacherAssignmentModal";
import { DeleteClassButton } from "@/components/classes/class-actions";
import { StudentMajorSelect } from "@/components/classes/student-major-select";
import { ClassMajorConfiguration } from "@/components/classes/class-major-configuration";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions, getAssignableHeadTeachers, getClassStudentRoster, getClassSubjectsMap, getClassTeachersAndAttendance } from "@/lib/services/academics";
import { formatGradeSection } from "@/lib/utils";

export default async function ManageSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("classes:manage");
  const [academicData, classDetails, subjectsByClass, headTeacherOptions, rosterData] = await Promise.all([
    getAcademicOptions(user), getClassTeachersAndAttendance(user), getClassSubjectsMap(user), getAssignableHeadTeachers(user), getClassStudentRoster(user, id)
  ]);
  const cls = academicData.classes.find((item) => item.id === id);
  if (!cls) notFound();
  const teachers = headTeacherOptions;
  const assignedTeachers = classDetails.teachersByClass[id] ?? [];
  const headTeacherAssignment = cls.head_teacher_id
    ? assignedTeachers.find((teacher: any) => teacher.teacher_id === cls.head_teacher_id) ?? null
    : null;
  const classSubjects = subjectsByClass[id] ?? [];
  const faculty = assignedTeachers.filter((teacher: any) => teacher.teacher_id !== cls.head_teacher_id);

  return <>
    <div className="mb-4"><Link href="/classes" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to classes</Link></div>
    <PageHeader
      eyebrow={cls.academic_year_name}
      title={formatGradeSection(cls.grade_name, cls.section_name)}
      description="Manage this section's people, subjects, room, and assignments on one page."
      actions={<>
        <TeacherAssignmentModal
          classId={cls.id}
          className={formatGradeSection(cls.grade_name, cls.section_name)}
          teachers={teachers}
          assignments={assignedTeachers}
          subjects={classSubjects.map((subject: any) => ({ id: subject.subject_id, name: subject.name }))}
          combinations={rosterData.combinationOptions}
          allowedMajors={cls.allowed_majors ?? []}
          gradeName={cls.grade_name}
        />
        <ClassFormModal grades={academicData.grades} sections={academicData.sections} academicYears={academicData.years} teachers={teachers} subjects={classSubjects.map((subject: any) => ({ id: subject.subject_id, name: subject.name }))} assignedTeachers={assignedTeachers} initialClass={{ id: cls.id, name: cls.name, grade_id: cls.grade_id, section_id: cls.section_id, academic_year_id: cls.academic_year_id, room: cls.room, head_teacher_id: cls.head_teacher_id }} />
      </>}
    />

    <Card className="mb-6">
      <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Academic major setup</CardTitle><Badge tone={(cls.major_count ?? 0) === 1 ? "green" : (cls.major_count ?? 0) > 1 ? "blue" : "gray"}>{cls.major_count ?? 0} configured</Badge></CardHeader>
      <CardContent><ClassMajorConfiguration classId={cls.id} options={rosterData.combinationOptions} initialAllowed={cls.allowed_majors ?? []} /></CardContent>
    </Card>

    <section className="mb-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Faculty ({faculty.length + (cls.head_teacher_id ? 1 : 0)})</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {cls.head_teacher_id ? (
            <div className="flex items-start justify-between gap-3 rounded-xl bg-primary-soft px-4 py-3">
              <div>
                <p className="font-semibold text-ink">{cls.head_teacher_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {headTeacherAssignment?.subject_names?.join(", ") || "No subject assigned"}
                </p>
              </div>
              <Badge tone="blue">Head Teacher</Badge>
            </div>
          ) : null}
          {faculty.map((teacher: any) => <div key={teacher.teacher_id} className="flex items-start justify-between gap-3 rounded-xl bg-surface-low px-4 py-3"><div><p className="font-semibold text-ink">{teacher.teacher_name}</p><p className="mt-1 text-xs text-muted">{teacher.subject_names.join(", ") || "No subject assigned"}</p></div><Badge tone="gray">Teacher</Badge></div>)}
          {!cls.head_teacher_id && !faculty.length ? <EmptyState title="No faculty assigned" description="Assign a head teacher or subject teacher above." className="min-h-32" /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Students ({rosterData.roster.length})</CardTitle></CardHeader>
        <CardContent className="grid max-h-96 gap-2 overflow-y-auto">
          {rosterData.roster.map((student: any) => {
            const major = student.major as string | null;
            return <div key={student.id} className="flex flex-col items-start justify-between gap-3 rounded-xl bg-surface-low px-4 py-3 sm:flex-row sm:items-center">
              <Link href={`/students/${student.id}`} prefetch={false} className="min-w-0 hover:text-primary"><p className="truncate font-semibold">{student.name}</p><p className="mt-1 text-xs text-muted">Admission: {student.admission_number ?? "—"}</p></Link>
              <StudentMajorSelect studentId={student.id} classId={cls.id} gradeName={cls.grade_name} currentMajor={major} options={rosterData.combinationOptions.filter((option: any) => !(cls.allowed_majors ?? []).length || (cls.allowed_majors ?? []).includes(option.value))} />
            </div>;
          })}
          {!rosterData.roster.length ? <EmptyState title="No active students" description="Add students from Student Management." className="min-h-32" /> : null}
          <ButtonLink href={`/students?classId=${cls.id}`} variant="secondary" size="sm" className="mt-2">Open student management</ButtonLink>
        </CardContent>
      </Card>
    </section>

    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.5fr)]">
      <div>
        <ClassSubjectManager classId={cls.id} gradeName={cls.grade_name} subjects={classSubjects} availableSubjects={academicData.subjects} />
      </div>
      <Card className="h-fit">
        <CardHeader><CardTitle>Section details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-xl bg-surface-low p-3"><MapPin className="h-4 w-4 text-primary" /> Room: {cls.room || "Not set"}</div>
          <div className="flex items-center gap-2 rounded-xl bg-surface-low p-3"><BookOpenCheck className="h-4 w-4 text-primary" /> {classSubjects.length} subjects</div>
          <div className="pt-2"><DeleteClassButton classId={cls.id} className={formatGradeSection(cls.grade_name, cls.section_name)} /></div>
        </CardContent>
      </Card>
    </section>
  </>;
}
