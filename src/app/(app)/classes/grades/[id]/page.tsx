import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Layers3, Sparkles } from "lucide-react";
import { GradeSubjectManager } from "@/components/classes/grade-subject-manager";
import { SubjectCombinationCreateForm } from "@/components/classes/subject-combination-create-form";
import { SubjectCombinationEditModal } from "@/components/classes/subject-combination-edit-modal";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions, getClassSubjectsMap } from "@/lib/services/academics";
import { getSubjectCombinationCatalog } from "@/lib/services/student-combinations";

const supportsCombinations = (gradeName: string) => /(?:grade\s*)?(8|9|10|11|12)\b/i.test(gradeName);

export default async function ManageGradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("classes:manage");
  const [academicData, subjectsByClass, catalog] = await Promise.all([getAcademicOptions(user), getClassSubjectsMap(user), getSubjectCombinationCatalog(user)]);
  const grade = academicData.grades.find((item: any) => item.id === id);
  if (!grade) notFound();
  const classes = academicData.classes.filter((cls: any) => cls.grade_id === id);
  const subjectIds = [...new Set(classes.flatMap((cls: any) => (subjectsByClass[cls.id] ?? []).map((subject: any) => subject.subject_id)))];
  const subjects = academicData.subjects.filter((subject: any) => subjectIds.includes(subject.id));
  const showCombinations = supportsCombinations(grade.name);
  const combinations = showCombinations ? [
    ...catalog.defaultCombinations.filter((item: any) => item.gradeId === id),
    ...catalog.customCombinations.filter((item: any) => item.gradeIds.includes(id))
  ] : [];

  return <>
    <PageHeader eyebrow="Academic structure" title={`Manage ${grade.name}`} description="Choose the subjects used by this grade. Added subjects are linked to every section in the grade." actions={<ButtonLink href="/classes" variant="secondary" className="rounded-2xl"><ArrowLeft className="h-4 w-4" /> Back to classes</ButtonLink>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
      <Card className="overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-card">
        <CardHeader className="border-b border-outline/50"><CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-primary" /> Subjects in {grade.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-5">{subjects.length ? <GradeSubjectManager gradeId={id} gradeName={grade.name} availableSubjects={academicData.subjects} linkedSubjectIds={subjectIds} linkedSubjects={subjects} /> : <><EmptyState title="No subjects in this grade" description="Tick a suggested subject or create a new one below." /><GradeSubjectManager gradeId={id} gradeName={grade.name} availableSubjects={academicData.subjects} linkedSubjectIds={subjectIds} /></>}</CardContent>
      </Card>
      {showCombinations ? <Card className="overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-card"><CardHeader className="border-b border-outline/50"><CardTitle className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /> Combinations</CardTitle></CardHeader><CardContent className="grid gap-3">{combinations.length ? combinations.map((combination: any) => <div key={`${combination.value}-${combination.id ?? "default"}`} className="flex items-start gap-3 rounded-[20px] border border-outline/55 bg-slate-50/70 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${combination.kind === "default" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>{combination.kind === "default" ? <Layers3 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="font-semibold text-ink">{combination.name}</p><span className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${combination.kind === "default" ? "border-emerald-200 bg-white text-emerald-700" : "border-amber-200 bg-white text-amber-700"}`}>{combination.kind === "default" ? "Default" : "Custom"}</span></div><SubjectCombinationEditModal combination={combination} classes={academicData.classes} subjects={academicData.subjects} /></div>) : <EmptyState title="No combinations yet" description="Create one for this grade below." />}<div className="mt-1"><SubjectCombinationCreateForm classes={academicData.classes} subjects={academicData.subjects} initialGradeId={id} triggerLabel="Create a new combination" triggerVariant="secondary" /></div></CardContent></Card> : null}
    </div>
  </>;
}
