import { PageHeader } from "@/components/layout/page-header";
import { SubjectCreateModal } from "@/components/subjects/subject-create-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/form-field";
import { AutoSubmit } from "@/components/ui/auto-submit";
import { requireUser } from "@/lib/auth/session";
import { getSubjectManagement } from "@/lib/services/academics";
import { assignSubjectTeacherAction, setStudentSubjectEnrollmentsAction } from "./actions";

export default async function SubjectsPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}) {
  const user = await requireUser("classes:manage");
  const params = await searchParams;
  const data = await getSubjectManagement(user, params.classId, params.subjectId);

  const selectedClass = data.classes.find((item) => item.id === data.selectedClassId);
  const selectedSubject = data.subjects.find((item) => item.id === data.selectedSubjectId);
  const selectedAssignment = data.assignments.find((row: any) => row.subject_id === data.selectedSubjectId);
  const assignmentProfiles = (selectedAssignment as any)?.profiles;
  const assignedTeacherName = Array.isArray(assignmentProfiles) ? assignmentProfiles[0]?.full_name : assignmentProfiles?.full_name;

  return (
    <>
      <PageHeader
        eyebrow="Academic structure"
        title="Subjects"
        description="Follow the steps below to configure subjects, assign teachers, and enroll students."
      />

      <section className="grid gap-8">
        {/* Step 1: Workspace Selection */}
        <Card className="overflow-hidden border-outline/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-outline/30 bg-surface-low/50 py-4">
            <div>
              <CardTitle className="text-base font-bold text-ink">Step 1: Select Workspace</CardTitle>
              <p className="mt-1 text-xs text-muted">Select a class and subject to configure.</p>
            </div>
            <SubjectCreateModal />
          </CardHeader>
          <CardContent className="p-6">
            <AutoSubmit>
              <form method="get" className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  <span>Class</span>
                  <Select name="classId" defaultValue={data.selectedClassId ?? ""} className="h-11">
                    <option value="">Select a class...</option>
                    {data.classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.grade_name} {item.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  <span>Subject</span>
                  <Select name="subjectId" defaultValue={data.selectedSubjectId ?? ""} className="h-11">
                    <option value="">Select a subject...</option>
                    {data.subjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </label>
              </form>
            </AutoSubmit>
          </CardContent>
        </Card>

        {!selectedClass || !selectedSubject ? (
          <EmptyState title="Select a class and subject first" description="Once selected, you can configure the teacher assignment and student enrollments." />
        ) : (
          <div className="grid gap-8">
            {/* Context Header for Steps 2 and 3 */}
            <div className="flex items-center gap-4 rounded-[16px] border border-outline/50 bg-primary/5 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Active Subject Workspace</p>
                <h2 className="mt-1 truncate text-lg font-bold text-ink">
                  {selectedClass.grade_name} {selectedClass.name} <span className="mx-2 font-normal text-muted-foreground/40">/</span> {selectedSubject.name}
                </h2>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              {/* Step 2: Subject Teacher */}
              <Card className="h-fit">
                <CardHeader className="flex flex-row items-center justify-between border-b border-outline/30 pb-4">
                  <div>
                    <CardTitle className="text-base font-bold text-ink">Step 2: Assign Teacher</CardTitle>
                    <p className="mt-1 text-xs text-muted">Who teaches this subject?</p>
                  </div>
                  {assignedTeacherName ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                      Assigned: {assignedTeacherName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Unassigned
                    </span>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  <form action={assignSubjectTeacherAction} className="grid gap-5">
                    <input type="hidden" name="class_id" value={data.selectedClassId} />
                    <input type="hidden" name="subject_id" value={data.selectedSubjectId} />
                    <Field label="Select Teacher">
                      <Select name="teacher_id" defaultValue={selectedAssignment?.teacher_id ?? ""} required className="h-11">
                        <option value="">Select teacher...</option>
                        {data.teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="flex justify-end pt-1">
                      <Button type="submit" variant="primary" className="font-bold shadow-button">
                        Save assignment
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Step 3: Student Enrollment */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-outline/30 pb-4">
                  <div>
                    <CardTitle className="text-base font-bold text-ink">Step 3: Student Enrollment</CardTitle>
                    <p className="mt-1 text-xs text-muted">Select students for this subject&apos;s register.</p>
                  </div>
                  <Button type="submit" form="student-subject-form" variant="primary" className="font-bold shadow-button">
                    Save enrollments
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  {!assignedTeacherName && (
                    <div className="mb-6 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <strong>Note:</strong> No teacher is assigned to this subject yet. You can still enroll students, but a teacher must be assigned before grading can begin.
                    </div>
                  )}

                  {!data.roster.length ? (
                    <EmptyState title="No active students" description="Enroll students in the class before assigning subjects." className="min-h-40" />
                  ) : (
                    <form id="student-subject-form" action={setStudentSubjectEnrollmentsAction} className="grid gap-2">
                      <input type="hidden" name="class_id" value={data.selectedClassId} />
                      <input type="hidden" name="subject_id" value={data.selectedSubjectId} />
                      <div className="grid max-h-[400px] gap-2 overflow-y-auto pr-2">
                        {data.roster.map((student) => (
                          <label
                            key={student.id}
                            className="flex cursor-pointer items-center justify-between gap-4 rounded-[12px] border border-outline/60 bg-surface-low px-4 py-3 transition hover:border-primary/50 hover:bg-primary/5 [&:has(:checked)]:border-primary/50 [&:has(:checked)]:bg-primary/5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-ink">{student.name}</p>
                              <p className="text-xs text-muted">Admission: {student.admission_number}</p>
                            </div>
                            <input
                              type="checkbox"
                              name="student_id"
                              value={student.id}
                              defaultChecked={data.enrolledStudentIds.has(student.id)}
                              className="h-5 w-5 accent-primary"
                            />
                          </label>
                        ))}
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
