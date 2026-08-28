import Link from "next/link";
import { initials, formatGradeSection } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const statusTone = {
  active: "green",
  graduated: "blue",
  transferred: "yellow",
  archived: "gray",
  cancelled: "red",
  pending_approval: "yellow",
  pending_cancellation: "yellow"
} as const;

export function StudentTable({ rows, limitedView = false }: { rows: any[]; limitedView?: boolean }) {
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
    <div className="card-surface overflow-hidden rounded-[18px]">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="font-label text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              {!limitedView ? <th className="px-4 py-3">Father&apos;s Name</th> : null}
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Admission No.</th>
              <th className="px-4 py-3">Gender</th>
              {!limitedView ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.id} className="border-t border-outline hover:bg-surface-low">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-surface-low border border-outline/50 flex items-center justify-center text-xs font-semibold text-muted">
                        {student.name_en ? student.name_en[0] : student.first_name?.[0]}
                      </div>
                    )}
                    <div>
                      <Link href={`/students/${student.id}`} prefetch={false} className="font-semibold text-primary hover:text-primary-ink">
                        {student.name_en || `${student.first_name} ${student.last_name}`}
                      </Link>
                      {student.name_ur && <p className="text-xs text-muted" dir="rtl">{student.name_ur}</p>}
                    </div>
                  </div>
                </td>
                {!limitedView ? <td className="px-4 py-4">
                  <div className="text-muted">{student.father_name_en || student.guardian_name || "-"}</div>
                  {student.father_phone && <div className="text-xs text-muted/70">{student.father_phone}</div>}
                </td> : null}
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-ink">
                    {formatGradeSection(student.grade_name, student.section_name) || "Unassigned"}
                  </div>
                </td>
                <td className="px-4 py-4 font-semibold">{student.admission_number}</td>
                <td className="px-4 py-4 text-muted capitalize">{student.gender || "-"}</td>
                {!limitedView ? <td className="px-4 py-4">
                  <details className="group relative">
                    <summary className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-surface-low list-none [&::-webkit-details-marker]:hidden">
                      Actions
                    </summary>
                    <div className="absolute right-0 z-10 mt-1 w-32 rounded-md border border-outline/40 bg-white p-1 shadow-soft">
                      <Link data-navigation-progress="immediate" href={`/students/${student.id}`} prefetch={false} className="block rounded px-2 py-1.5 text-xs text-ink hover:bg-surface-low">View Profile</Link>
                      <Link data-navigation-progress="immediate" href={`/students/${student.id}?edit=true`} prefetch={false} className="block rounded px-2 py-1.5 text-xs text-ink hover:bg-surface-low">Edit Details</Link>
                    </div>
                  </details>
                </td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 lg:hidden">
        {rows.map((student) => (
          <Link key={student.id} href={`/students/${student.id}`} prefetch={false} className="rounded-2xl bg-surface-low p-4 ring-1 ring-outline/70 transition hover:bg-primary-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {student.photo_url ? (
                  <img src={student.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white border border-outline/50 flex items-center justify-center text-sm font-bold text-muted">
                    {student.name_en ? student.name_en[0] : student.first_name?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-ink">
                    {student.name_en || `${student.first_name} ${student.last_name}`}
                  </p>
                  <p className="text-xs text-muted">{student.admission_number}</p>
                </div>
              </div>
              <Badge tone={statusTone[student.status as keyof typeof statusTone] ?? "gray"}>{student.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted">
              {formatGradeSection(student.grade_name, student.section_name) || "Unassigned"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
