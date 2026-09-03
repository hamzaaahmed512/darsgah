"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardCheck, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <section className="rounded-[30px] border border-outline/70 bg-white p-5 shadow-card sm:p-7">
      <div className="mb-6">
        <h2 className="font-display text-[1.85rem] font-bold tracking-tight text-ink">Marked Attendance</h2>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-muted">Select Class</span>
          <div className="relative">
            <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
            <Select
              value={selectedClassId ?? ""}
              onChange={(event) => updateFilters(event.target.value, attendanceDate)}
              aria-label="Select class"
              className="h-14 appearance-none rounded-2xl border-outline/70 bg-white pl-14 pr-10 text-base shadow-none"
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatClassDisplayName(item.grade_name, item.name, item.section_name)}
                </option>
              ))}
            </Select>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-muted">Select Date</span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
            <Input
              type="date"
              value={attendanceDate}
              onChange={(event) => updateFilters(selectedClassId ?? "", event.target.value)}
              aria-label="Attendance date"
              className="h-14 rounded-2xl border-outline/70 bg-white pl-12 text-base shadow-none"
            />
          </div>
        </label>
      </div>

      {!submitted || !markedRows.length ? (
        <div className="flex min-h-[290px] flex-col items-center justify-center rounded-[24px] border border-outline/60 bg-slate-50/60 px-6 py-10 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm">
            <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="font-display text-3xl font-bold tracking-tight text-ink">No marked attendance</h3>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            Marked attendance for the selected class and date will appear here after a teacher submits it.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-outline/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-outline/50 font-label text-xs uppercase tracking-[0.18em] text-muted">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Admission #</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {markedRows.map((student) => (
                  <tr key={student.student_id} className="border-b border-outline/30 bg-white last:border-b-0 hover:bg-surface-low/40">
                    <td className="px-5 py-4 font-semibold text-ink">{student.student_name}</td>
                    <td className="px-5 py-4 text-muted">{student.admission_number}</td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone[student.current_status!]}>
                        {student.current_status!.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-muted">{student.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
