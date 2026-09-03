"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CalendarDays, NotebookPen, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form-field";
import type { AttendanceStatus } from "@/types/database";
import type { TeacherAttendanceSubmission } from "@/lib/validation/attendance";

const statuses: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export function TeacherAttendanceForm({
  teachers,
  attendanceDate,
  submitted,
  migrationRequired,
  onSubmit
}: {
  teachers: Array<{
    teacher_id: string;
    teacher_name: string;
    teacher_email: string | null;
    role: string;
    department: string | null;
    job_title: string | null;
    current_status: AttendanceStatus | null;
    note: string | null;
  }>;
  attendanceDate: string;
  submitted: boolean;
  migrationRequired?: boolean;
  onSubmit: (values: TeacherAttendanceSubmission) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState(() =>
    teachers.map((teacher) => ({
      teacher_id: teacher.teacher_id,
      status: teacher.current_status ?? "present",
      note: teacher.note ?? ""
    }))
  );
  const [editing, setEditing] = useState(!submitted);
  const summary = {
    total: teachers.length,
    present: records.filter((record) => record.status === "present").length,
    absent: records.filter((record) => record.status === "absent").length,
    late: records.filter((record) => record.status === "late").length,
    excused: records.filter((record) => record.status === "excused").length
  };

  useEffect(() => {
    setRecords(
      teachers.map((teacher) => ({
        teacher_id: teacher.teacher_id,
        status: teacher.current_status ?? "present",
        note: teacher.note ?? ""
      }))
    );
    setEditing(!submitted);
  }, [teachers, submitted]);

  function updateDate(date: string) {
    const params = new URLSearchParams(searchParams);
    params.set("view", "teachers");
    if (date) params.set("date", date);
    router.replace(`/attendance?${params.toString()}`);
  }

  function setStatus(teacherId: string, status: AttendanceStatus) {
    setRecords((current) => current.map((record) => (record.teacher_id === teacherId ? { ...record, status } : record)));
  }

  function setNote(teacherId: string, note: string) {
    setRecords((current) => current.map((record) => (record.teacher_id === teacherId ? { ...record, note } : record)));
  }

  function submit() {
    if (migrationRequired) {
      setError("Apply the latest database migration to enable teacher attendance.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({
          attendance_date: attendanceDate,
          records: records.map((record) => ({ ...record, note: record.note || null }))
        });
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Teacher attendance could not be saved.");
      }
    });
  }

  function undo() {
    setError(null);
    setEditing(true);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[26px] border border-outline/70 bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.62fr)_auto] xl:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-muted">Select Date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
              <Input
                type="date"
                value={attendanceDate}
                onChange={(event) => updateDate(event.target.value)}
                aria-label="Teacher attendance date"
                className="h-12 rounded-2xl border-outline/70 bg-white pl-12 text-sm shadow-none"
              />
            </div>
          </label>
          <div className="flex w-full flex-wrap gap-2 md:w-auto md:flex-nowrap">
            {submitted && !editing ? (
              <Button type="button" variant="secondary" onClick={undo} disabled={pending || migrationRequired} className="min-h-12 flex-1 rounded-2xl px-4 text-sm md:flex-none">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Undo & Edit
              </Button>
            ) : null}
            <Button
              onClick={submit}
              disabled={pending || !teachers.length || migrationRequired || (submitted && !editing)}
              variant={submitted && !editing ? "secondary" : "primary"}
              className="min-h-12 flex-1 rounded-2xl px-5 text-sm md:w-auto md:flex-none"
            >
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
              {pending ? "Saving..." : editing && submitted ? "Resubmit attendance" : submitted ? "Attendance marked" : "Save teacher attendance"}
            </Button>
          </div>
        </div>
        {migrationRequired ? (
          <div className="mt-4 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
            Apply the latest database migration to enable teacher attendance.
          </div>
        ) : null}
        {error ? <div className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
      </section>

      <Card className="rounded-[24px] border border-outline/70 bg-white shadow-card">
        <CardHeader className="gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-blue-50 text-primary">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-[1.45rem]">Teacher Attendance</CardTitle>
              <p className="mt-1.5 text-sm text-muted">{editing && submitted ? "Update the saved records and resubmit the attendance." : submitted ? "Teacher attendance has been marked for this date." : "Default status is present. Update exceptions before saving."}</p>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-5">
            <SummaryChip label="Total Staff" value={summary.total} />
            <SummaryChip label="Present" value={summary.present} tone="green" />
            <SummaryChip label="Absent" value={summary.absent} tone="red" />
            <SummaryChip label="Late" value={summary.late} tone="yellow" />
            <SummaryChip label="Excused" value={summary.excused} tone="slate" />
          </div>
        </CardHeader>
        <CardContent>
          {!teachers.length ? (
            <EmptyState title="No teachers found" description="Active teachers and head teachers will appear here once they are added to staff." />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-outline/50">
              <div className="hidden grid-cols-[52px_minmax(220px,1.15fr)_minmax(320px,0.9fr)_minmax(220px,0.8fr)] items-center gap-4 border-b border-outline/40 bg-slate-50/80 px-5 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:grid">
                <span>#</span>
                <span>Teacher</span>
                <span>Status</span>
                <span>Note (Optional)</span>
              </div>
              <div className="grid">
              {teachers.map((teacher) => {
                const record = records.find((item) => item.teacher_id === teacher.teacher_id);
                return (
                  <div key={teacher.teacher_id} className="grid gap-3 border-b border-outline/35 px-4 py-3.5 last:border-b-0 lg:grid-cols-[52px_minmax(220px,1.15fr)_minmax(320px,0.9fr)_minmax(220px,0.8fr)] lg:items-center lg:px-5">
                    <div className="text-lg font-medium text-ink">{teachers.findIndex((item) => item.teacher_id === teacher.teacher_id) + 1}</div>
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getAvatarToneClasses(teacher.teacher_name)}`}>
                        {getInitials(teacher.teacher_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold leading-none text-ink">{teacher.teacher_name}</p>
                        <p className="mt-1 truncate text-xs text-muted">
                          {teacher.job_title || "Teacher"}
                          {teacher.department ? ` · ${teacher.department}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(teacher.teacher_id, status)}
                          disabled={submitted && !editing}
                          className={`rounded-xl border px-3.5 py-2 text-sm font-semibold capitalize transition ${
                            record?.status === status ? statusButtonTone(status, true) : statusButtonTone(status, false)
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={record?.note ?? ""}
                      onChange={(event) => setNote(teacher.teacher_id, event.target.value)}
                      placeholder="Optional note..."
                      aria-label={`Attendance note for ${teacher.teacher_name}`}
                      disabled={submitted && !editing}
                      className="min-h-11 rounded-2xl text-sm"
                    />
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "red" | "yellow" | "slate";
}) {
  const toneClass =
    tone === "green"
      ? "text-success"
      : tone === "red"
        ? "text-danger"
        : tone === "yellow"
          ? "text-warning"
          : tone === "slate"
            ? "text-slate-600"
            : "text-ink";

  return (
    <div className="rounded-[16px] border border-outline/55 bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold leading-none ${toneClass}`}>{value}</p>
    </div>
  );
}

function statusButtonTone(status: AttendanceStatus, active: boolean) {
  if (!active) return "border-outline/60 bg-white text-muted hover:border-primary/30 hover:text-primary";
  if (status === "present") return "border-primary bg-primary text-white";
  if (status === "absent") return "border-danger bg-danger text-white";
  if (status === "late") return "border-warning bg-warning text-white";
  return "border-slate-500 bg-slate-500 text-white";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarToneClasses(name: string) {
  const tones = [
    "border-blue-100 bg-blue-50 text-blue-600",
    "border-emerald-100 bg-emerald-50 text-emerald-600",
    "border-violet-100 bg-violet-50 text-violet-600",
    "border-amber-100 bg-amber-50 text-amber-600",
    "border-cyan-100 bg-cyan-50 text-cyan-600"
  ];
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
