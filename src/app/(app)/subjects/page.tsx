import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { getSubjectManagement } from "@/lib/services/academics";
import { assignSubjectTeacherAction, createSubjectAction, setStudentSubjectEnrollmentsAction } from "./actions";

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
        description="Create subjects, select a class and subject from dropdowns, assign the teacher, and manage the student roster in one view."
      />

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader className="items-center">
              <div>
                <CardTitle>Create subject</CardTitle>
                <p className="mt-1 text-sm text-muted">Add a new subject to the school catalog.</p>
              </div>
              <Button type="submit" form="create-subject-form">
                Create subject
              </Button>
            </CardHeader>
            <CardContent>
              <form id="create-subject-form" action={createSubjectAction} className="grid gap-4">
                <Field label="Name">
                  <Input name="name" required placeholder="Mathematics" />
                </Field>
                <Field label="Code">
                  <Input name="code" placeholder="MTH-101" />
                </Field>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="items-center">
              <div>
                <CardTitle>Choose class and subject</CardTitle>
                <p className="mt-1 text-sm text-muted">Use the dropdowns to switch the subject workspace.</p>
              </div>
              <Button type="submit" form="subject-selection-form" variant="secondary">
                Open
              </Button>
            </CardHeader>
            <CardContent>
              <form id="subject-selection-form" method="get" className="grid gap-4">
                <Field label="Class">
                  <Select name="classId" defaultValue={data.selectedClassId ?? ""}>
                    {data.classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.grade_name} {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subject">
                  <Select name="subjectId" defaultValue={data.selectedSubjectId ?? ""}>
                    {data.subjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </form>
            </CardContent>
          </Card>
        </div>

        {!selectedClass || !selectedSubject ? (
          <EmptyState title="Create a class and subject first" description="Select a class and a subject to configure its teacher and student enrollments." />
        ) : (
          <div className="grid content-start gap-6">
            <Card>
              <CardHeader className="items-center">
                <div>
                  <CardTitle>Subject teacher</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    {selectedClass.grade_name} {selectedClass.name} - {selectedSubject.name}
                  </p>
                </div>
                <Button type="submit" form="subject-teacher-form">
                  Save assignment
                </Button>
              </CardHeader>
              <CardContent>
                <form id="subject-teacher-form" action={assignSubjectTeacherAction} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="hidden" name="class_id" value={data.selectedClassId} />
                  <input type="hidden" name="subject_id" value={data.selectedSubjectId} />
                  <Field label="Teacher">
                    <Select name="teacher_id" defaultValue={selectedAssignment?.teacher_id ?? ""} required>
                      <option value="">Select teacher</option>
                      {data.teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </form>

                <div className="mt-4 rounded-[16px] bg-surface-low p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Current assignment</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {assignedTeacherName ?? "No teacher assigned"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="items-center">
                <div>
                  <CardTitle>Student subject enrollment</CardTitle>
                  <p className="mt-1 text-sm text-muted">Checked students appear in this subject&apos;s marks register.</p>
                </div>
                <Button type="submit" form="student-subject-form">
                  Save enrollments
                </Button>
              </CardHeader>
              <CardContent>
                {!selectedAssignment ? (
                  <EmptyState title="Assign a teacher first" description="A subject must be assigned to this class before students can be enrolled." className="min-h-40" />
                ) : !data.roster.length ? (
                  <EmptyState title="No active students in this class" description="Enroll students in the class before assigning subjects." className="min-h-40" />
                ) : (
                  <form id="student-subject-form" action={setStudentSubjectEnrollmentsAction} className="grid gap-3">
                    <input type="hidden" name="class_id" value={data.selectedClassId} />
                    <input type="hidden" name="subject_id" value={data.selectedSubjectId} />
                    <div className="grid gap-3">
                      {data.roster.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center justify-between gap-4 rounded-[16px] border border-outline/60 bg-surface-low px-4 py-3 transition hover:border-outline hover:bg-white"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{student.name}</p>
                            <p className="text-xs text-muted">{student.admission_number}</p>
                          </div>
                          <input
                            type="checkbox"
                            name="student_id"
                            value={student.id}
                            defaultChecked={data.enrolledStudentIds.has(student.id)}
                            className="h-4 w-4 accent-primary"
                          />
                        </label>
                      ))}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </>
  );
}
