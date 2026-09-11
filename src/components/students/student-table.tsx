import Link from "next/link";
import { formatGradeSection } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { formatStudentName } from "@/lib/student-name";
import { ArrowRight, ArrowUpDown, Eye, UsersRound } from "lucide-react";
import { StudentPagination } from "@/components/students/student-pagination";

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
    <div className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><UsersRound className="h-5 w-5 text-primary" />Students List</h2>
        {pagination ? <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{pagination.count} students</span> : null}
      </div>
      <div className="student-table-scroll hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-6 py-4">
                <span className="inline-flex items-center gap-2">Student <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" /></span>
              </th>
              {!limitedView ? <th className="px-6 py-4">Father&apos;s Name</th> : null}
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Admission No.</th>
              <th className="px-6 py-4">Gender</th>
              <th className="px-6 py-4">Status</th>
              {!limitedView ? <th className="px-6 py-4">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.id} className="border-t border-slate-100 transition hover:bg-blue-50/30">
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
                    </div>
                  </div>
                </td>
                {!limitedView ? <td className="px-6 py-5">
                  <div className="text-sm font-medium text-slate-600">{student.father_name_en || student.guardian_name || "-"}</div>
                  {student.father_phone && <div className="text-xs text-slate-400">{student.father_phone}</div>}
                </td> : null}
                <td className="px-6 py-5">
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                    {formatGradeSection(student.grade_name, student.section_name) || "Unassigned"}
                  </span>
                </td>
                <td className="px-6 py-5 font-semibold text-slate-900">{student.admission_number}</td>
                <td className="px-6 py-5 text-slate-600 capitalize">{student.gender || "-"}</td>
                <td className="px-6 py-5"><StudentStatus status={student.status} /></td>
                {!limitedView ? <td className="px-6 py-5">
                  <Link
                    data-navigation-progress="immediate"
                    href={`/students/${student.id}`}
                    prefetch={false}
                    className="inline-flex min-h-9 items-center gap-1.5 justify-center rounded-xl bg-blue-50 px-3 text-sm font-semibold text-primary transition hover:bg-blue-100"
                  >
                    <Eye className="h-4 w-4" />View Profile<ArrowRight className="h-3.5 w-3.5" />
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
              <StudentStatus status={student.status} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
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

function StudentStatus({ status }: { status: string }) {
  const normalized = status.replaceAll("_", " ");
  const styles = status === "active" ? "bg-emerald-50 text-emerald-700" : status === "cancelled" || status === "withdrawn" ? "bg-rose-50 text-rose-700" : status.includes("pending") || status === "transferred" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize ${styles}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{normalized}</span>;
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
