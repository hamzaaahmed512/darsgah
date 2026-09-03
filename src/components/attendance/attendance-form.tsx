"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form-field";
import type { AttendanceStatus } from "@/types/database";
import type { AttendanceSubmission } from "@/lib/validation/attendance";
import { formatClassDisplayName } from "@/lib/utils";

const statuses: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export function AttendanceForm({
  classes,
  roster,
  selectedClassId,
  attendanceDate,
  submitted,
  canSubmit,
  canUndo,
  editWindowOpen,
  editDeadline,
  restrictionMessage,
  onSubmit,
  onUndo
}: {
  classes: Array<{ id: string; name: string; grade_name: string; section_name: string | null; can_mark_attendance?: boolean }>;
  roster: Array<{ student_id: string; student_name: string; admission_number: string; current_status: AttendanceStatus | null; note: string | null }>;
  selectedClassId?: string;
  attendanceDate: string;
  submitted: boolean;
  canSubmit: boolean;
  canUndo: boolean;
  editWindowOpen: boolean;
  editDeadline?: string | null;
  restrictionMessage?: string | null;
  onSubmit: (values: AttendanceSubmission) => Promise<void>;
  onUndo: (classId: string, attendanceDate: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState(() =>
    roster.map((student) => ({
      student_id: student.student_id,
      status: student.current_status ?? "present",
      note: student.note ?? ""
    }))
  );

  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId), [classes, selectedClassId]);

  function updateFilters(classId: string, date: string) {
    const params = new URLSearchParams(searchParams);
    if (classId) params.set("classId", classId);
    if (date) params.set("date", date);
    router.replace(`/attendance?${params.toString()}`);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRecords((current) => current.map((record) => (record.student_id === studentId ? { ...record, status } : record)));
  }

  function setNote(studentId: string, note: string) {
    setRecords((current) => current.map((record) => (record.student_id === studentId ? { ...record, note } : record)));
  }

  function submit() {
    if (!selectedClassId) return;
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({
          class_id: selectedClassId,
          attendance_date: attendanceDate,
          records: records.map((record) => ({ ...record, note: record.note || null }))
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Attendance could not be submitted.");
      }
    });
  }

  function undo() {
    if (!selectedClassId || !window.confirm("Reopen this attendance for editing? You must resubmit it within 24 hours.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await onUndo(selectedClassId, attendanceDate);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Attendance could not be reopened.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <Select value={selectedClassId ?? ""} onChange={(event) => updateFilters(event.target.value, attendanceDate)} aria-label="Select class">
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {formatClassDisplayName(item.grade_name, item.name, item.section_name)}
              </option>
            ))}
          </Select>
          <Input type="date" value={attendanceDate} onChange={(event) => updateFilters(selectedClassId ?? "", event.target.value)} aria-label="Attendance date" />
          <div className="flex w-full gap-2 md:w-auto">
            {canUndo ? (
              <Button type="button" variant="secondary" onClick={undo} disabled={pending} className="flex-1 md:flex-none">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Undo & Edit
              </Button>
            ) : null}
            <Button onClick={submit} disabled={!canSubmit || pending || !roster.length} className="flex-1 md:flex-none">
              <Save className="h-4 w-4" aria-hidden="true" />
              {pending ? "Saving..." : editWindowOpen ? "Resubmit attendance" : submitted ? "Attendance marked" : "Submit attendance"}
            </Button>
          </div>
        </div>
        {editWindowOpen ? (
          <div className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">
            Attendance is open for editing. Resubmit within 24 hours{editDeadline ? ` (before ${new Date(editDeadline).toLocaleString()})` : ""}; otherwise the previous submission remains final.
          </div>
        ) : null}
        {restrictionMessage ? <div className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">{restrictionMessage}</div> : null}
        {error ? <div className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{error}</div> : null}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{selectedClass ? formatClassDisplayName(selectedClass.grade_name, selectedClass.name, selectedClass.section_name) : "Class roster"}</CardTitle>
            <p className="mt-1 text-sm text-muted">{editWindowOpen ? "Update the saved records and resubmit before the edit window closes." : submitted ? "Attendance already marked for today." : "Default status is present. Update exceptions before saving."}</p>
          </div>
        </CardHeader>
        <CardContent>
          {!classes.length ? (
            <EmptyState title="No classes available" description="Teachers see classes where they are head teacher or subject teacher. Administrators can configure assignments in Academics." />
          ) : !roster.length ? (
            <EmptyState title="No students enrolled" description="Add enrollments before taking attendance for this class." />
          ) : (
            <div className="grid gap-3">
              {roster.map((student) => {
                const record = records.find((item) => item.student_id === student.student_id);
                return (
                  <div key={student.student_id} className="grid gap-3 rounded-lg bg-surface-low p-4 xl:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,0.8fr)] xl:items-center">
                    <div>
                      <p className="font-semibold text-ink">{student.student_name}</p>
                      <p className="text-xs text-muted">{student.admission_number}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(student.student_id, status)}
                          disabled={!canSubmit}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                            record?.status === status ? "bg-primary text-white" : "bg-white text-muted hover:text-primary"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={record?.note ?? ""}
                      onChange={(event) => setNote(student.student_id, event.target.value)}
                      placeholder="Optional note"
                      disabled={!canSubmit}
                      aria-label={`Attendance note for ${student.student_name}`}
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
