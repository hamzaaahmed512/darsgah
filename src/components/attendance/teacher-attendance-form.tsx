"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
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
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Teacher attendance could not be saved.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[220px_auto]">
          <Input type="date" value={attendanceDate} onChange={(event) => updateDate(event.target.value)} aria-label="Teacher attendance date" />
          <Button onClick={submit} disabled={pending || !teachers.length || migrationRequired} className="w-full md:w-auto">
            <Save className="h-4 w-4" aria-hidden="true" />
            {pending ? "Saving..." : submitted ? "Update teacher attendance" : "Save teacher attendance"}
          </Button>
        </div>
        {migrationRequired ? (
          <div className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">
            Apply the latest database migration to enable teacher attendance.
          </div>
        ) : null}
        {error ? <div className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{error}</div> : null}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Teacher Attendance</CardTitle>
            <p className="mt-1 text-sm text-muted">{submitted ? "Teacher attendance has been marked for this date." : "Default status is present. Update exceptions before saving."}</p>
          </div>
        </CardHeader>
        <CardContent>
          {!teachers.length ? (
            <EmptyState title="No teachers found" description="Active teachers and head teachers will appear here once they are added to staff." />
          ) : (
            <div className="grid gap-3">
              {teachers.map((teacher) => {
                const record = records.find((item) => item.teacher_id === teacher.teacher_id);
                return (
                  <div key={teacher.teacher_id} className="grid gap-3 rounded-lg bg-surface-low p-4 xl:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,0.8fr)] xl:items-center">
                    <div>
                      <p className="font-semibold text-ink">{teacher.teacher_name}</p>
                      <p className="text-xs text-muted">
                        {teacher.job_title || (teacher.role === "head_teacher" ? "Head Teacher" : "Teacher")}
                        {teacher.department ? ` - ${teacher.department}` : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(teacher.teacher_id, status)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                            record?.status === status ? "bg-primary text-white" : "bg-white text-muted hover:text-primary"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={record?.note ?? ""}
                      onChange={(event) => setNote(teacher.teacher_id, event.target.value)}
                      placeholder="Optional note"
                      aria-label={`Attendance note for ${teacher.teacher_name}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
