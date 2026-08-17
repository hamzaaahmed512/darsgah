import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { getSubjectManagement } from "@/lib/services/academics";
import { assignSubjectTeacherAction, createSubjectAction, setStudentSubjectEnrollmentsAction } from "./actions";

export default async function SubjectsPage({ searchParams }: { searchParams: Promise<{ classId?: string; subjectId?: string }> }) {
  const user = await requireUser("classes:manage");
  const params = await searchParams;
  const data = await getSubjectManagement(user, params.classId, params.subjectId);
  const assigned = data.assignments.find((row: any) => row.subject_id === data.selectedSubjectId);
  return <>
    <PageHeader eyebrow="Academic structure" title="Subjects" description="Assign a subject teacher per class, then explicitly choose the students studying that subject." />
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <Card><CardHeader><CardTitle>Create subject</CardTitle></CardHeader><CardContent><form action={createSubjectAction} className="grid gap-3"><Field label="Name"><Input name="name" required /></Field><Field label="Code"><Input name="code" /></Field><Button>Create subject</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle>Choose class and subject</CardTitle></CardHeader><CardContent className="grid gap-2">{data.classes.map((item) => data.subjects.map((subject) => <Link key={`${item.id}:${subject.id}`} href={`/subjects?classId=${item.id}&subjectId=${subject.id}`} className={`rounded-lg border p-3 text-sm ${data.selectedClassId === item.id && data.selectedSubjectId === subject.id ? "border-primary bg-primary-soft text-primary" : "border-outline/50 hover:bg-surface-low"}`}><b>{item.grade_name} {item.name}</b><span className="block text-muted">{subject.name}</span></Link>))}</CardContent></Card>
      </div>
      {!data.selectedClassId || !data.selectedSubjectId ? <EmptyState title="Create a class and subject first" description="Select a class and a subject to configure its teacher and student enrollments." /> : <div className="grid content-start gap-6">
        <Card><CardHeader><CardTitle>Subject teacher</CardTitle></CardHeader><CardContent><form action={assignSubjectTeacherAction} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="class_id" value={data.selectedClassId} /><input type="hidden" name="subject_id" value={data.selectedSubjectId} /><Field label="Teacher"><Select name="teacher_id" defaultValue={assigned?.teacher_id ?? ""} required><option value="">Select teacher</option>{data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</Select></Field><Button className="self-end">Save assignment</Button></form></CardContent></Card>
        <Card><CardHeader><div><CardTitle>Student subject enrollment</CardTitle><p className="mt-1 text-sm text-muted">Only checked students appear in this subject&apos;s marks register.</p></div></CardHeader><CardContent>{!assigned ? <EmptyState title="Assign a teacher first" description="A subject must be assigned to this class before students can be enrolled." className="min-h-40" /> : !data.roster.length ? <EmptyState title="No active students in this class" description="Enroll students in the class before assigning subjects." className="min-h-40" /> : <form action={setStudentSubjectEnrollmentsAction} className="grid gap-3"><input type="hidden" name="class_id" value={data.selectedClassId} /><input type="hidden" name="subject_id" value={data.selectedSubjectId} />{data.roster.map((student) => <label key={student.id} className="flex items-center justify-between rounded-lg bg-surface-low p-4"><span><b className="text-ink">{student.name}</b><span className="ml-2 text-sm text-muted">{student.admission_number}</span></span><input type="checkbox" name="student_id" value={student.id} defaultChecked={data.enrolledStudentIds.has(student.id)} className="h-4 w-4 accent-primary" /></label>)}<div className="flex justify-end"><Button>Save student enrollments</Button></div></form>}</CardContent></Card>
      </div>}
    </section>
  </>;
}
