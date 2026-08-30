"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form-field";
import type { AttendanceStatus } from "@/types/database";
import { formatClassDisplayName } from "@/lib/utils";

const statusTone: Record<AttendanceStatus, "green" | "red" | "yellow" | "blue"> = {
  present: "green",
  absent: "red",
  late: "yellow",
  excused: "blue"
};

export function AttendanceRegisterView({
  classes,
  roster,
  selectedClassId,
  attendanceDate,
  submitted
}: {
  classes: Array<{ id: string; name: string; grade_name: string; section_name: string | null }>;
  roster: Array<{ student_id: string; student_name: string; admission_number: string; current_status: AttendanceStatus | null; note: string | null }>;
  selectedClassId?: string;
  attendanceDate: string;
  submitted: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const markedRows = roster.filter((student) => student.current_status);

  function updateFilters(classId: string, date: string) {
    const params = new URLSearchParams(searchParams);
    if (classId) params.set("classId", classId);
    if (date) params.set("date", date);
    router.replace(`/attendance?${params.toString()}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marked Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Select value={selectedClassId ?? ""} onChange={(event) => updateFilters(event.target.value, attendanceDate)} aria-label="Select class">
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {formatClassDisplayName(item.grade_name, item.name, item.section_name)}
              </option>
            ))}
          </Select>
          <Input type="date" value={attendanceDate} onChange={(event) => updateFilters(selectedClassId ?? "", event.target.value)} aria-label="Attendance date" />
        </div>

        {!submitted || !markedRows.length ? (
          <EmptyState title="No marked attendance" description="Marked attendance for the selected class and date will appear here after a teacher submits it." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline/50 font-label text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Admission #</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {markedRows.map((student) => (
                  <tr key={student.student_id} className="border-b border-outline/30 hover:bg-surface-low/70">
                    <td className="px-4 py-4 font-semibold text-ink">{student.student_name}</td>
                    <td className="px-4 py-4 text-muted">{student.admission_number}</td>
                    <td className="px-4 py-4">
                      <Badge tone={statusTone[student.current_status!]}>
                        {student.current_status!.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-muted">{student.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
