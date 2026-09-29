"use client";

import { useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-field";

type MarkRow = {
  admission_number: string;
  student_name: string;
  is_absent: boolean;
  marks_obtained: string | number | null;
  grade: string;
  teacher_comment: string | null;
};

export function ResultDetailTable({
  marks,
  maxMarks,
  requiresApproval
}: {
  marks: MarkRow[];
  maxMarks: number;
  requiresApproval: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return marks;
    return marks.filter((row) =>
      row.student_name.toLowerCase().includes(q) || row.admission_number.toLowerCase().includes(q)
    );
  }, [marks, searchQuery]);

  return (
    <>
      <Card className="mb-5 min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-600">
          <span>Search Student</span>
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or admission number..."
              className="min-h-12 min-w-0 w-full rounded-xl border-blue-100 bg-blue-50/70 pl-10 pr-3 text-sm shadow-none placeholder:text-slate-400 focus:border-primary/30 focus:bg-white sm:min-h-14 sm:rounded-2xl sm:pl-12 sm:text-base"
            />
          </div>
        </label>
      </Card>

      <Card className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 px-5 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-xl"><UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />Student Marks</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={requiresApproval ? "yellow" : "blue"}>{requiresApproval ? "Major assessment" : "Regular assessment"}</Badge>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{marks.length} student{marks.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        {filteredMarks.length ? (
          <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-blue-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Admission No.</th>
                  <th className="px-6 py-4">Marks</th>
                  <th className="px-6 py-4">Grade</th>
                  <th className="px-6 py-4">Comment</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((row, index) => (
                  <tr key={`${row.admission_number}-${index}`} className="border-t border-slate-100 transition hover:bg-blue-50/30">
                    <td className="px-6 py-5"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getStudentAvatarTone(row.student_name)}`}>{getInitials(row.student_name)}</span><span className="font-semibold text-slate-900">{row.student_name}</span></div></td>
                    <td className="px-6 py-5 font-semibold text-slate-700">{row.admission_number}</td>
                    <td className="px-6 py-5 text-slate-700">{row.is_absent ? "Absent" : `${row.marks_obtained} / ${Number(maxMarks)}`}</td>
                    <td className="px-6 py-5"><span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{row.grade}</span></td>
                    <td className="max-w-sm px-6 py-5 text-slate-600">{row.teacher_comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 lg:hidden">
            {filteredMarks.map((row, index) => (
              <article key={`${row.admission_number}-${index}`} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getStudentAvatarTone(row.student_name)}`}>{getInitials(row.student_name)}</span><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{row.student_name}</p><p className="text-xs text-slate-500">{row.admission_number}</p></div></div><span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{row.grade}</span></div>
                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Marks</p><p className="mt-1 font-semibold text-slate-700">{row.is_absent ? "Absent" : `${row.marks_obtained} / ${Number(maxMarks)}`}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Comment</p><p className="mt-1 text-sm text-slate-600">{row.teacher_comment || "—"}</p></div></div>
              </article>
            ))}
          </div>
          </>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-muted">{searchQuery ? "No students found matching your search." : "No marks recorded yet."}</p>
        )}
      </Card>
    </>
  );
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getStudentAvatarTone(name: string) {
  const tones = [
    "border-blue-100 bg-blue-50 text-blue-600",
    "border-emerald-100 bg-emerald-50 text-emerald-600",
    "border-violet-100 bg-violet-50 text-violet-600",
    "border-amber-100 bg-amber-50 text-amber-600",
    "border-cyan-100 bg-cyan-50 text-cyan-600"
  ];
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
