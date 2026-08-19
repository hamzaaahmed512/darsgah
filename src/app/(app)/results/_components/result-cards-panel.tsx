import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/form-field";
import { formatExamType, requiredResultExamTypes } from "@/lib/services/marks";

type ResultCardsWorkspace = {
  classes: any[];
  selectedClassId?: string;
  examType: string;
  month?: number;
  readiness: {
    complete: boolean;
    missing: string[];
    examType: string;
    month?: number;
    students: Array<{ id: string; name: string; admission_number: string }>;
  } | null;
};

export function ResultCardsPanel({ workspace }: { workspace: ResultCardsWorkspace }) {
  const selectedClass = workspace.classes.find((item) => item.id === workspace.selectedClassId);
  const ready = workspace.readiness?.complete;

  if (!workspace.selectedClassId || !workspace.readiness) {
    return <EmptyState title="No classes available" description="Create classes and enroll students before generating result cards." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{selectedClass?.name ?? "Selected class"}</CardTitle>
            <p className="mt-1 text-sm text-muted">
              {formatExamType(workspace.examType as any)}
              {workspace.examType === "monthly" && workspace.month
                ? ` / ${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, workspace.month - 1, 1))}`
                : ""}
            </p>
          </div>
          {ready ? (
            <ButtonLink href={`/results/print?classId=${workspace.selectedClassId}&examType=${workspace.examType}${workspace.month ? `&month=${workspace.month}` : ""}`} target="_blank">
              <Printer className="h-4 w-4" /> Print / PDF All
            </ButtonLink>
          ) : null}
        </CardHeader>
        <CardContent>
          {ready ? (
            <div className="grid gap-2">
              {workspace.readiness.students.map((student) => (
                <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3">
                  <div>
                    <p className="font-semibold text-ink">{student.name}</p>
                    <p className="text-xs text-muted">{student.admission_number}</p>
                  </div>
                  <ButtonLink
                    href={`/results/print?classId=${workspace.selectedClassId}&examType=${workspace.examType}${workspace.month ? `&month=${workspace.month}` : ""}&studentId=${student.id}`}
                    target="_blank"
                    variant="secondary"
                    size="sm"
                  >
                    Print / PDF Individual
                  </ButtonLink>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Results are not ready" description="The Registrar can print result cards after every required major examination is approved." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness</CardTitle>
          {ready ? <Badge tone="green">Ready</Badge> : <Badge tone="yellow">Waiting for approvals</Badge>}
        </CardHeader>
        <CardContent>
          {ready ? (
            <p className="rounded-lg bg-success-soft p-3 text-sm font-semibold text-success">
              All required major examinations are approved. Result cards are unlocked.
            </p>
          ) : (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-ink">Missing approved results</p>
              {workspace.readiness.missing.length ? (
                workspace.readiness.missing.map((item) => (
                  <div key={item} className="rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">
                    {item}
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-warning-soft p-3 text-sm font-semibold text-warning">No assigned subjects were found for this class.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ResultCardsFilters({ workspace }: { workspace: ResultCardsWorkspace }) {
  return (
    <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px_auto]" action="/results">
      <input type="hidden" name="view" value="cards" />
      <Field label="Class">
        <Select name="classId" defaultValue={workspace.selectedClassId ?? ""}>
          {workspace.classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.grades?.name} / {item.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Exam type">
        <Select name="examType" defaultValue={workspace.examType}>
          {requiredResultExamTypes.map((type) => <option key={type} value={type}>{formatExamType(type)}</option>)}
        </Select>
      </Field>
      <Field label="Month (Monthly only)">
        <Select name="month" defaultValue={workspace.month ?? ""}>
          <option value="">Not applicable</option>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1))}</option>
          ))}
        </Select>
      </Field>
      <div className="flex items-end">
        <button className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" type="submit">
          Check
        </button>
      </div>
    </form>
  );
}
