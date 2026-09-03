import type { ReactNode } from "react";
import { ArrowLeft, BookOpenCheck, Boxes, CircleDot, Layers3, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubjectCombinationCreateForm } from "@/components/classes/subject-combination-create-form";
import { SubjectCombinationEditModal } from "@/components/classes/subject-combination-edit-modal";
import { SubjectCreateModal } from "@/components/subjects/subject-create-modal";
import { SubjectDeleteModal } from "@/components/subjects/subject-delete-modal";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions } from "@/lib/services/academics";
import { getSubjectCombinationCatalog } from "@/lib/services/student-combinations";

export default async function SubjectsPage() {
  const user = await requireUser("classes:manage");
  const [data, combinations] = await Promise.all([getAcademicOptions(user), getSubjectCombinationCatalog(user)]);
  const totalCombinations = combinations.defaultCombinations.length + combinations.customCombinations.length;

  return (
    <>
      <PageHeader
        eyebrow="Academic structure"
        title="Subjects and Combinations"
        description="Maintain subjects and the subject combinations students can choose from."
        actions={
          <>
            <ButtonLink href="/classes" variant="secondary" className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" /> Back to classes
            </ButtonLink>
            <SubjectCreateModal />
            <SubjectCombinationCreateForm classes={data.classes} subjects={data.subjects} />
          </>
        }
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <MetricCard
          icon={<BookOpenCheck className="h-5 w-5" />}
          title="Subject Catalog"
          value={data.subjects.length}
          note="Available school subjects"
          tone="blue"
        />
        <MetricCard
          icon={<Layers3 className="h-5 w-5" />}
          title="Default Combinations"
          value={combinations.defaultCombinations.length}
          note="Built-in grade combinations"
          tone="emerald"
        />
        <MetricCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Custom Combinations"
          value={combinations.customCombinations.length}
          note="School-specific combinations"
          tone="amber"
        />
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.72fr)]">
        <Card className="overflow-hidden rounded-[30px] border border-outline/70 bg-white shadow-card">
          <CardHeader className="border-b border-outline/50 bg-slate-50/70 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-[1.45rem]">Current Combinations</CardTitle>
                <p className="mt-1.5 text-sm text-muted">
                  Default and custom combinations that control which subjects students can take.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 py-5 sm:px-6">
            {totalCombinations ? (
              <>
                {combinations.defaultCombinations.map((combination: any, index: number) => (
                  <div
                    key={`${combination.value}-${combination.gradeId}-${index}`}
                    className="flex flex-col items-start gap-4 rounded-[24px] border border-outline/55 bg-slate-50/70 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:justify-between"
                  >
                    <div className="min-w-0 flex flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <CircleDot className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-[1.08rem] font-bold text-ink">{combination.name} for {combination.gradeName}</p>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Default
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">Built-in combination for this grade.</p>
                        <SubjectList subjects={combination.subjectNames} />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <SubjectCombinationEditModal combination={combination} classes={data.classes} subjects={data.subjects} />
                    </div>
                  </div>
                ))}

                {combinations.customCombinations.map((combination) => (
                  <div
                    key={combination.id}
                    className="flex flex-col items-start gap-4 rounded-[24px] border border-outline/55 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:justify-between"
                  >
                    <div className="min-w-0 flex flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-[1.08rem] font-bold text-ink">
                            {combination.name} for {combination.gradeNames.join(", ") || "No grades"}
                          </p>
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Custom
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">School-defined combination.</p>
                        <SubjectList subjects={combination.subjectNames} />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <SubjectCombinationEditModal combination={combination} classes={data.classes} subjects={data.subjects} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <EmptyState title="No combinations yet" description="Create a class first, then add combinations here." />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border border-outline/70 bg-white shadow-card">
          <CardHeader className="border-b border-outline/50 bg-slate-50/70 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-[1.45rem]">Subject Catalog</CardTitle>
                <p className="mt-1.5 text-sm text-muted">{data.subjects.length} subjects currently available across the school.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-6">
            {data.subjects.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {data.subjects.map((subject: any, index: number) => (
                  <div
                    key={subject.id}
                    className="flex items-start justify-between gap-3 rounded-[22px] border border-outline/55 bg-slate-50/60 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${getSubjectTone(index)}`}>
                        {getSubjectInitials(subject.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{subject.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {subject.code || "No subject code"}
                          {subject.is_elective ? " · Elective" : ""}
                        </p>
                      </div>
                    </div>
                    <SubjectDeleteModal subjectId={subject.id} subjectName={subject.name} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No subjects yet" description="Create the first subject using the button above." />
            )}
          </CardContent>
        </Card>
      </div>

    </>
  );
}

function MetricCard({
  icon,
  title,
  value,
  note,
  tone
}: {
  icon: ReactNode;
  title: string;
  value: number;
  note: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : "bg-blue-50 text-primary";

  return (
    <div className="rounded-[26px] border border-outline/70 bg-white p-4 shadow-card">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses}`}>{icon}</div>
      <p className="text-sm font-semibold text-muted">{title}</p>
      <p className="mt-1 text-[1.75rem] font-bold leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-sm text-muted">{note}</p>
    </div>
  );
}

function getSubjectTone(index: number) {
  const tones = [
    "border-blue-100 bg-blue-50 text-blue-600",
    "border-emerald-100 bg-emerald-50 text-emerald-600",
    "border-violet-100 bg-violet-50 text-violet-600",
    "border-amber-100 bg-amber-50 text-amber-600",
    "border-cyan-100 bg-cyan-50 text-cyan-600"
  ];
  return tones[index % tones.length];
}

function getSubjectInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SubjectList({ subjects }: { subjects: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {subjects.length > 0 ? (
        subjects.map((subject) => (
          <span key={subject} className="inline-flex items-center rounded-full border border-outline/55 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            {subject}
          </span>
        ))
      ) : (
        <p className="text-sm text-muted">No subjects selected</p>
      )}
    </div>
  );
}
