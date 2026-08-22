import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubjectCreateModal } from "@/components/subjects/subject-create-modal";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions } from "@/lib/services/academics";

export default async function SubjectsPage() {
  const user = await requireUser("classes:manage");
  const data = await getAcademicOptions(user);

  return <>
    <PageHeader
      eyebrow="Academic structure"
      title="Subjects"
      description="View and maintain the school subject catalog. Link subjects to individual sections from Classes."
      actions={<>
        <ButtonLink href="/classes" variant="secondary"><ArrowLeft className="h-4 w-4" /> Back to classes</ButtonLink>
        <SubjectCreateModal />
      </>}
    />

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
