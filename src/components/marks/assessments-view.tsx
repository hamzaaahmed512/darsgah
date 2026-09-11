import { CalendarDays, CheckCircle2, ClipboardList, Edit3, FileQuestion, Medal, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { ClassSubjectSelect } from "@/components/marks/class-subject-select";
import { CreateAssessmentDialog } from "@/components/marks/create-assessment-dialog";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getTeacherMarksWorkspace } from "@/lib/services/marks";

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
  const markedCount = visibleExams.filter((exam: any) => exam.is_marked).length;
  const unmarkedCount = visibleExams.length - markedCount;
  const studentsAwaitingMarks = visibleExams.reduce((total: number, exam: any) => total + Math.max(0, Number(exam.roster_count ?? 0) - Number(exam.marked_count ?? 0)), 0);

  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Assessments"
        description="Create assessments for your assigned classes, then open each assessment for marking."
        actions={
          workspace.selected ? (
            <CreateAssessmentDialog classId={workspace.selected.class_id} subjectId={workspace.selected.subject_id} />
          ) : null
        }
      />

      {!workspace.options.length ? (
        <EmptyState title="No teaching assignments" description="This page appears only when you have an active class and subject assignment." />
      ) : (
        <>
        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Assessments" value={visibleExams.length} hint="In this view" icon={ClipboardList} tone="blue" trend={range === "all" ? "All periods" : range === "month" ? "This month" : "This year"} />
          <StatCard label="Ready" value={markedCount} hint="Marks saved" icon={CheckCircle2} tone="green" trend={visibleExams.length ? `${Math.round((markedCount / visibleExams.length) * 100)}% completed` : "No assessments"} trendTone="positive" />
          <StatCard label="To mark" value={unmarkedCount} hint="Assessments awaiting marks" icon={Edit3} tone="amber" trend={unmarkedCount ? "Action needed" : "All caught up"} trendTone={unmarkedCount ? "negative" : "positive"} />
          <StatCard label="Student entries" value={studentsAwaitingMarks} hint="Marks still to enter" icon={Users} tone="purple" trend={studentsAwaitingMarks ? "Across selected assessments" : "No pending entries"} />
        </section>
        <Card className="overflow-hidden rounded-[24px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
          <CardHeader className="gap-4 border-b border-blue-200 pb-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary ring-1 ring-blue-100">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-[1.6rem]">Assessment List</CardTitle>
                <p className="mt-1 text-sm text-muted">Create, manage, and mark assessments for your classes.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="mb-5 grid gap-4 rounded-[18px] border border-blue-100 bg-blue-50/45 p-4 xl:grid-cols-[minmax(420px,640px)_1fr] xl:items-end">
              <div className="rounded-2xl bg-white/70 p-1">
                <ClassSubjectSelect
                  options={workspace.options}
                  selectedClassId={workspace.selected?.class_id}
                  selectedSubjectId={workspace.selected?.subject_id}
                  range={range}
                  basePath={basePath}
                />
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
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
                    className="min-h-10 rounded-2xl px-4 text-sm"
                  >
                    {item.label}
                  </ButtonLink>
                ))}
              </div>
            </div>

            {!visibleExams.length ? (
              <EmptyState title="No assessments found" description="Create an assessment or switch the filter to view another period." />
            ) : (
              <div className="overflow-hidden rounded-[20px] border border-blue-200 bg-white">
                {visibleExams.map((exam: any) => (
                  <div key={exam.id} className="border-b border-blue-100 p-4 last:border-b-0 transition-colors hover:bg-blue-50/35 sm:px-5 sm:py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${getAssessmentToneClasses(exam.title)}`}>
                          <FileQuestion className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-words font-display text-xl font-bold leading-tight text-ink sm:text-[1.45rem]">{exam.title}</p>
                              <WorkflowStatusBadge status={exam.workflow_status} />
                              <Badge tone={exam.is_marked ? "green" : "gray"}>{exam.is_marked ? "Marked" : "Unmarked"}</Badge>
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-muted">
                              {formatExamType(exam.exam_type)}
                              {exam.month ? ` / ${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, exam.month - 1, 1))}` : ""}
                              {" / "}
                              {exam.term}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" /> {formatDateLabel(exam.exam_date)}</span>
                              <span className="flex items-center gap-1.5"><Medal className="h-4 w-4 text-amber-600" /> {Number(exam.max_marks)} marks</span>
                              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-violet-600" /> {exam.marked_count} / {exam.roster_count} students marked</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full justify-end lg:w-auto">
                        <ButtonLink
                          href={buildMarkingHref(basePath, exam)}
                          variant="secondary"
                          size="sm"
                          className="min-h-10 w-full justify-center rounded-2xl border-primary/40 px-4 text-sm text-primary hover:bg-primary-soft sm:w-auto"
                        >
                          {exam.is_marked ? <Edit3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          {exam.is_marked ? "Edit Marks" : "Do Marking"}
                        </ButtonLink>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {visibleExams.length ? (
              <div className="mt-4 flex flex-col items-stretch gap-3 rounded-[18px] border border-blue-200 bg-blue-50/30 px-4 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p>Showing 1 to {visibleExams.length} of {visibleExams.length} assessments</p>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline/60 bg-white text-muted" disabled>
                    ‹
                  </button>
                  <button type="button" className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary-soft px-3 font-semibold text-primary">
                    1
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline/60 bg-white text-muted" disabled>
                    ›
                  </button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        </>
      )}
    </>
  );
}

function formatDateLabel(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getAssessmentToneClasses(value: string) {
  const tones = [
    "bg-violet-50 text-violet-600 ring-violet-100",
    "bg-emerald-50 text-emerald-600 ring-emerald-100",
    "bg-blue-50 text-blue-600 ring-blue-100",
    "bg-amber-50 text-amber-600 ring-amber-100"
  ];
  const hash = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
