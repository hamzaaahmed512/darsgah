import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubjectCombinationCreateForm } from "@/components/classes/subject-combination-create-form";
import { SubjectCombinationEditModal } from "@/components/classes/subject-combination-edit-modal";
import { SubjectCreateModal } from "@/components/subjects/subject-create-modal";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions } from "@/lib/services/academics";
import { getSubjectCombinationCatalog } from "@/lib/services/student-combinations";

export default async function SubjectsPage() {
  const user = await requireUser("classes:manage");
  const [data, combinations] = await Promise.all([getAcademicOptions(user), getSubjectCombinationCatalog(user)]);

  return <>
    <PageHeader
      eyebrow="Academic structure"
      title="Subjects and Combinations"
      description="Maintain subjects and the subject combinations students can choose from."
      actions={<>
        <ButtonLink href="/classes" variant="secondary"><ArrowLeft className="h-4 w-4" /> Back to classes</ButtonLink>
        <SubjectCreateModal />
        <SubjectCombinationCreateForm classes={data.classes} subjects={data.subjects} />
      </>}
    />

    <div className="mb-6 grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Current combinations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {combinations.defaultCombinations.length || combinations.customCombinations.length ? (
            <>
              {combinations.defaultCombinations.map((combination: any, index: number) => (
                <div key={`${combination.value}-${combination.gradeId}-${index}`} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-outline/50 bg-surface-low px-5 py-4 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-ink">{combination.name} for {combination.gradeName}</p>
                    <p className="mt-1 text-xs text-muted">Default combination</p>
                    <SubjectList subjects={combination.subjectNames} />
                  </div>
                  <div className="shrink-0">
                    <SubjectCombinationEditModal
                      combination={combination}
                      classes={data.classes}
                      subjects={data.subjects}
                    />
                  </div>
                </div>
              ))}
              {combinations.customCombinations.map((combination) => (
                <div key={combination.id} className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-xl border border-outline/50 bg-white px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-ink">{combination.name} for {combination.gradeNames.join(", ") || "No grades"}</p>
                    <p className="mt-1 text-xs text-muted">Custom combination</p>
                    <SubjectList subjects={combination.subjectNames} />
                  </div>
                  <div className="shrink-0 mt-4 sm:mt-0">
                    <SubjectCombinationEditModal
                      combination={combination}
                      classes={data.classes}
                      subjects={data.subjects}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : <EmptyState title="No combinations yet" description="Create a class first, then add combinations here." />}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-primary" /> All subjects ({data.subjects.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {data.subjects.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.subjects.map((subject: any) => (
              <div key={subject.id} className="rounded-xl border border-outline/50 bg-surface-low px-4 py-3">
                <p className="font-semibold text-ink">{subject.name}</p>
                <p className="mt-1 text-xs text-muted">{subject.code || "No subject code"}{subject.is_elective ? " · Elective" : ""}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No subjects yet" description="Create the first subject using the button above." />}
      </CardContent>
    </Card>
  </>;
}

function SubjectList({ subjects }: { subjects: string[] }) {
  return (
    <div className="mt-3">
      {subjects.length > 0 ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted">
          <span className="font-semibold text-ink">Subjects: </span>
          {subjects.join(", ")}
        </p>
      ) : (
        <p className="text-sm text-muted">No subjects selected</p>
      )}
    </div>
  );
}
