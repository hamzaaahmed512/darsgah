import { CheckCircle2, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { ClassSubjectSelect } from "@/components/marks/class-subject-select";
import { CreateAssessmentDialog } from "@/components/marks/create-assessment-dialog";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getTeacherMarksWorkspace, majorAssessmentTypes, regularAssessmentTypes } from "@/lib/services/marks";
import type { ExamType } from "@/types/database";

const examTypes: Array<{ value: ExamType; label: string; group: "regular" | "major" }> = [
  ...regularAssessmentTypes.map((value) => ({
    value,
    label: formatExamType(value),
    group: "regular" as const
  })),
  ...majorAssessmentTypes.map((value) => ({
    value,
    label: formatExamType(value),
    group: "major" as const
  }))
];

const rangeFilters = [
  { value: "all", label: "All" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" }
] as const;

type RangeFilter = (typeof rangeFilters)[number]["value"];

function buildAssessmentsHref(basePath: string, params: { classId?: string; subjectId?: string; range?: string }) {
  const query = new URLSearchParams();
  if (params.classId) query.set("classId", params.classId);
  if (params.subjectId) query.set("subjectId", params.subjectId);
  if (params.range && params.range !== "all") query.set("range", params.range);
  const qs = query.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

function buildMarkingHref(basePath: string, exam: any) {
  const query = new URLSearchParams();
  query.set("classId", exam.class_id);
  query.set("subjectId", exam.subject_id);
  const markBase = basePath === "/admin/academic-control" ? "/admin/academic-control/mark" : "/academics/exams-setup/mark";
  return `${markBase}/${exam.id}?${query.toString()}`;
}

function filterAssessments(exams: any[], range: RangeFilter) {
  if (range === "all") return exams;
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return exams.filter((exam) => {
    const date = String(exam.exam_date ?? "");
    return range === "month" ? date.startsWith(currentMonth) : date.startsWith(currentYear);
  });
}

export async function AssessmentsView({
  searchParams,
  basePath = "/academics/exams-setup"
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  basePath?: string;
}) {
  const params = await searchParams;
  const user = await requireUser("academics:view");
  const range = rangeFilters.some((item) => item.value === params.range) ? (params.range as RangeFilter) : "all";
  const workspace = await getTeacherMarksWorkspace(user, {
    classId: params.classId,
    subjectId: params.subjectId
  });
  const visibleExams = filterAssessments(workspace.exams, range);

  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Assessments"
        description="Create assessments for your assigned classes, then open each assessment for marking."
        actions={
          workspace.selected ? (
            <CreateAssessmentDialog classId={workspace.selected.class_id} subjectId={workspace.selected.subject_id} examTypes={examTypes} />
          ) : null
        }
      />

      {!workspace.options.length ? (
        <EmptyState title="No teaching assignments" description="This page appears only when you have an active class and subject assignment." />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Assessment List</CardTitle>
              <p className="mt-1 text-sm text-muted">
                {workspace.selected?.class_name} / {workspace.selected?.subject_name}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(280px,420px)_1fr] lg:items-end">
              <ClassSubjectSelect
                options={workspace.options}
                selectedClassId={workspace.selected?.class_id}
                selectedSubjectId={workspace.selected?.subject_id}
                range={range}
                basePath={basePath}
              />
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {rangeFilters.map((item) => (
                  <ButtonLink
                    key={item.value}
                    href={buildAssessmentsHref(basePath, {
                      classId: workspace.selected?.class_id,
                      subjectId: workspace.selected?.subject_id,
                      range: item.value
                    })}
                    variant={range === item.value ? "primary" : "secondary"}
                    size="sm"
                  >
                    {item.label}
                  </ButtonLink>
                ))}
              </div>
            </div>

            {!visibleExams.length ? (
              <EmptyState title="No assessments found" description="Create an assessment or switch the filter to view another period." />
            ) : (
              <div className="grid gap-3">
                {visibleExams.map((exam: any) => (
                  <div key={exam.id} className="rounded-lg border border-outline/50 bg-white p-4 transition hover:bg-surface-low">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-ink">{exam.title}</p>
                          <WorkflowStatusBadge status={exam.workflow_status} />
                          <Badge tone={exam.is_marked ? "green" : "gray"}>{exam.is_marked ? "Marked" : "Unmarked"}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {formatExamType(exam.exam_type)}
                          {exam.month ? ` / ${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, exam.month - 1, 1))}` : ""}
                          {" / "}
                          {exam.term}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {exam.exam_date} / {Number(exam.max_marks)} marks / {exam.marked_count} of {exam.roster_count} students marked
                        </p>
                      </div>
                      <ButtonLink href={buildMarkingHref(basePath, exam)} variant={exam.is_marked ? "secondary" : "primary"} size="sm">
                        {exam.is_marked ? <Edit3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {exam.is_marked ? "Edit Marks" : "Do Marking"}
                      </ButtonLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
