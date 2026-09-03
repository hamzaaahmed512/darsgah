import Link from "next/link";
import { formatGradeSection } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatStudentName } from "@/lib/student-name";
import { ArrowUpDown } from "lucide-react";
import { StudentPagination } from "@/components/students/student-pagination";

const statusTone = {
  active: "green",
  graduated: "blue",
  transferred: "yellow",
  archived: "gray",
  cancelled: "red",
  pending_approval: "yellow",
  pending_cancellation: "yellow"
} as const;

export function StudentTable({
  rows,
  limitedView = false,
  pagination
}: {
  rows: any[];
  limitedView?: boolean;
  pagination?: { count: number; page: number; pageSize: number };
}) {
  if (!rows.length) {
    return (
      <EmptyState 
        title="No students found" 
        description="Try a different search, status, class filter, or add a new student." 
        action={!limitedView ? (
          <Link href="/students?action=new" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-ink">
            Add Student
          </Link>
        ) : undefined}
      />
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white font-label text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-6 py-4">
                <span className="inline-flex items-center gap-2">Student <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" /></span>
              </th>
              {!limitedView ? <th className="px-6 py-4">Father&apos;s Name</th> : null}
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Admission No.</th>
              <th className="px-6 py-4">Gender</th>
              {!limitedView ? <th className="px-6 py-4">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.id} className="border-t border-slate-200/80 transition hover:bg-slate-50/70">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${getStudentAvatarTone(formatStudentName({ name: student.name_en, firstName: student.first_name, lastName: student.last_name }))}`}>
                        {String(student.name_en ? student.name_en[0] : student.first_name?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link href={`/students/${student.id}`} prefetch={false} className="font-semibold text-slate-900 hover:text-primary">
                        {formatStudentName({ name: student.name_en, firstName: student.first_name, lastName: student.last_name })}
                      </Link>
                      {student.name_ur && <p className="text-xs text-muted" dir="rtl">{student.name_ur}</p>}
                    </div>
                  </div>
                </td>
                {!limitedView ? <td className="px-6 py-5">
                  <div className="text-sm font-medium text-slate-600">{student.father_name_en || student.guardian_name || "-"}</div>
                  {student.father_phone && <div className="text-xs text-slate-400">{student.father_phone}</div>}
                </td> : null}
                <td className="px-6 py-5">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                    {formatGradeSection(student.grade_name, student.section_name) || "Unassigned"}
                  </span>
                </td>
                <td className="px-6 py-5 font-semibold text-slate-900">{student.admission_number}</td>
                <td className="px-6 py-5 text-slate-600 capitalize">{student.gender || "-"}</td>
                {!limitedView ? <td className="px-6 py-5">
                  <Link
                    data-navigation-progress="immediate"
                    href={`/students/${student.id}`}
                    prefetch={false}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg px-2 text-sm font-semibold text-primary hover:text-primary-ink"
                  >
                    View Profile
                  </Link>
                </td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {rows.map((student) => (
          <Link key={student.id} href={`/students/${student.id}`} prefetch={false} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/20 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {student.photo_url ? (
                  <img src={student.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${getStudentAvatarTone(formatStudentName({ name: student.name_en, firstName: student.first_name, lastName: student.last_name }))}`}>
                    {String(student.name_en ? student.name_en[0] : student.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {formatStudentName({ name: student.name_en, firstName: student.first_name, lastName: student.last_name })}
                  </p>
                  <p className="text-xs text-slate-500">{student.admission_number}</p>
                </div>
              </div>
              <Badge tone={statusTone[student.status as keyof typeof statusTone] ?? "gray"}>{student.status}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatGradeSection(student.grade_name, student.section_name) || "Unassigned"}
              </span>
              <span className="text-sm font-semibold text-primary">View Profile</span>
            </div>
          </Link>
        ))}
      </div>
      {pagination ? <StudentPagination {...pagination} /> : null}
    </div>
  );
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
