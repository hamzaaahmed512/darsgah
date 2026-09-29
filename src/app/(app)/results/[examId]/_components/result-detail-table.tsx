"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <Card>
        <CardHeader>
          <CardTitle>Student Marks</CardTitle>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
            {marks.length} Total Student{marks.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="font-label text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-3 pr-4">Student</th>
                  <th className="py-3 pr-4">Admission #</th>
                  <th className="py-3 pr-4">Marks</th>
                  <th className="py-3 pr-4">Grade</th>
                  <th className="py-3 pr-4">Comment</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((row, index) => (
                  <tr key={`${row.admission_number}-${index}`} className="border-t border-outline/60 hover:bg-surface-low/50 transition">
                    <td className="py-3 pr-4 font-semibold text-ink">{row.student_name}</td>
                    <td className="py-3 pr-4 text-muted">{row.admission_number}</td>
                    <td className="py-3 pr-4">
                      {row.is_absent ? "Absent" : row.marks_obtained} / {Number(maxMarks)}
                    </td>
                    <td className="py-3 pr-4 font-bold">{row.grade}</td>
                    <td className="py-3 pr-4 text-muted">{row.teacher_comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredMarks.length ? (
            <p className="mt-4 text-sm text-muted text-center py-4">
              {searchQuery ? "No students found matching your search." : "No marks recorded yet."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
