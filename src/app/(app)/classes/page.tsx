import { Suspense } from "react";
import type { ReactNode } from "react";
import { BookOpenCheck, CalendarCheck, CalendarDays, ChevronDown, GraduationCap, Layers3, MapPin, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions, getClassTeachersAndAttendance } from "@/lib/services/academics";
import { getStaff } from "@/lib/services/staff";
import { ClassFormModal } from "@/components/classes/class-form";
import { TeacherAssignmentModal } from "@/components/classes/teacher-assignment-form";
import { DeleteClassButton, RemoveAssignmentButton } from "@/components/classes/class-actions";
import { ClassFilterForm } from "@/components/classes/class-filter-form";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClassesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser("classes:manage");

  const [academicData, classDetails] = await Promise.all([
    getAcademicOptions(user),
    getClassTeachersAndAttendance(user)
  ]);

  const allStaff = await getStaff(user);
  const teachers = allStaff.filter((staffMember: any) => staffMember.role === "teacher");

  const filterGrade = params.grade ?? "all";
  const filterClass = params.classId ?? "all";
  const filterQ = (params.q ?? "").toLowerCase();

  const filteredClasses = academicData.classes.filter((cls) => {
    if (filterGrade !== "all" && cls.grade_id !== filterGrade) return false;
    if (filterClass !== "all" && cls.id !== filterClass) return false;
    if (!filterQ) return true;

    const matchText = `${cls.name} ${cls.grade_name} ${cls.section_name ?? ""} ${cls.room ?? ""} ${cls.head_teacher_name ?? ""}`.toLowerCase();
    return matchText.includes(filterQ);
  });

  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Class Management"
        description="Organize the academic structure, assign teachers, and manage each class from one place."
        actions={
          <ClassFormModal
            grades={academicData.grades}
            sections={academicData.sections}
            academicYears={academicData.years}
            teachers={teachers}
          />
        }
      />

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Academic years" value={academicData.years.length} icon={<CalendarDays className="h-5 w-5" />} />
        <SummaryCard title="Grades" value={academicData.grades.length} icon={<GraduationCap className="h-5 w-5" />} />
        <SummaryCard title="Sections" value={academicData.sections.length} icon={<Layers3 className="h-5 w-5" />} />
        <SummaryCard title="Subjects" value={academicData.subjects.length} icon={<BookOpenCheck className="h-5 w-5" />} />
      </section>

      <Card className="mb-5 p-4">
        <Suspense>
          <ClassFilterForm grades={academicData.grades} classes={academicData.classes} />
        </Suspense>
      </Card>

      {filteredClasses.length === 0 ? (
        <EmptyState
          title="No classes found"
          description="Create a new class or try clearing your search filters."
        />
      ) : (
        <div className="grid gap-3">
          {filteredClasses.map((cls) => {
            const assignedTeachers = classDetails.teachersByClass[cls.id] ?? [];
            const attendance = classDetails.attendanceByClass[cls.id];
            const studentCount = classDetails.studentsByClass[cls.id] ?? 0;
            const students = classDetails.studentListByClass[cls.id] ?? [];
            const totalRecords = attendance ? attendance.present + attendance.absent + attendance.late + attendance.excused : 0;
            const attendanceRate = totalRecords > 0
              ? Math.round(((attendance.present + attendance.late) / totalRecords) * 100)
              : null;

            return (
              <details key={cls.id} className="group overflow-hidden rounded-[18px] bg-white shadow-card ring-1 ring-outline/70">
                <summary className="grid cursor-pointer gap-4 px-5 py-4 transition hover:bg-surface-low md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <Badge tone="blue">{cls.grade_name}</Badge>
                        {cls.section_name ? <Badge tone="gray">Section {cls.section_name}</Badge> : null}
                        <Badge tone="blue">{cls.academic_year_name}</Badge>
                    </div>
                    <h3 className="truncate font-display text-lg font-semibold text-ink">{cls.name}</h3>
                    <p className="mt-1 text-sm text-muted">{cls.head_teacher_name ?? "No head teacher"} / {studentCount} students / {assignedTeachers.length} teachers</p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-sm font-semibold text-muted">{attendanceRate !== null ? `${attendanceRate}% attendance` : "No attendance yet"}</span>
                    <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" aria-hidden="true" />
                  </div>
                </summary>

                <div className="grid gap-5 border-t border-outline/60 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoTile icon={<ShieldCheck className="h-4 w-4" />} label="Head Teacher" value={cls.head_teacher_name ?? "Not assigned"} hint={cls.head_teacher_email ?? undefined} />
                    <InfoTile icon={<MapPin className="h-4 w-4" />} label="Room" value={cls.room ?? "Not set"} />
                    <InfoTile icon={<CalendarCheck className="h-4 w-4" />} label="Attendance Rate" value={attendanceRate !== null ? `${attendanceRate}%` : "No records yet"} />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
                    <div className="rounded-lg border border-outline/40 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold text-muted">
                          <Users className="h-4 w-4" /> Other Teachers ({assignedTeachers.length})
                        </span>
                      </div>
                      {assignedTeachers.length > 0 ? (
                        <ul className="space-y-1.5 pr-1">
                          {assignedTeachers.map((teacher) => (
                            <li key={teacher.id} className="flex items-center justify-between gap-2 rounded-md bg-surface-low px-3 py-2 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-ink">{teacher.teacher_name}</p>
                                {teacher.subject_name ? <p className="truncate text-xs text-muted">{teacher.subject_name}</p> : null}
                              </div>
                              <RemoveAssignmentButton assignmentId={teacher.id} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs italic text-muted">No teachers assigned yet.</p>
                      )}
                      <div className="mt-3">
                        <TeacherAssignmentModal
                          classId={cls.id}
                          className={cls.name}
                          teachers={teachers}
                          subjects={academicData.subjects}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-outline/40 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold text-muted">
                          <GraduationCap className="h-4 w-4" /> Students ({students.length})
                        </span>
                      </div>
                      {students.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {students.map((student) => (
                            <div key={student.id} className="rounded-md bg-surface-low px-3 py-2 text-sm">
                              <p className="truncate font-semibold text-ink">{student.name}</p>
                              <p className="text-xs text-muted">{student.admission_number ?? "No admission number"}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs italic text-muted">No active students assigned.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <ClassFormModal
                      grades={academicData.grades}
                      sections={academicData.sections}
                      academicYears={academicData.years}
                      teachers={teachers}
                      initialClass={{
                        id: cls.id,
                        name: cls.name,
                        grade_id: cls.grade_id,
                        section_id: cls.section_id,
                        academic_year_id: cls.academic_year_id,
                        room: cls.room,
                        head_teacher_id: cls.head_teacher_id
                      }}
                    />
                    <DeleteClassButton classId={cls.id} className={cls.name} />
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}

function InfoTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm">
      <div className="mb-1 flex items-center gap-1.5 text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="truncate text-lg font-bold text-ink">{value}</p>
      {hint ? <p className="truncate text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
        </div>
        <div className="rounded-lg bg-primary-soft p-3 text-primary">{icon}</div>
      </div>
    </Card>
  );
}
