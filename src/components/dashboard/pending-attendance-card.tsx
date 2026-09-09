import { PendingAttendanceList } from "@/components/dashboard/pending-attendance-list";
import { formatDatePK } from "@/lib/utils";
import type { PendingAttendanceClass } from "@/types/database";
import { CalendarDays, ClipboardCheck, Clock3 } from "lucide-react";

export function PendingAttendanceCard({ classes, today }: { classes: PendingAttendanceClass[]; today: string }) {
  const todayLabel = formatDatePK(today);
  const count = classes.length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_16px_42px_rgba(37,99,235,0.07)]">
      <div className="flex flex-col gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${count ? "bg-amber-50 text-amber-600 ring-amber-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100"}`}>
            {count ? <Clock3 className="h-6 w-6" aria-hidden="true" /> : <ClipboardCheck className="h-6 w-6" aria-hidden="true" />}
          </span>
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-primary">Daily operations</p>
            <h2 className="mt-1 font-display text-[1.4rem] font-bold tracking-tight text-ink">Pending Attendance Today</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted"><CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />{todayLabel}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-xs font-bold sm:self-auto ${count ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{count ? `${count} ${count === 1 ? "Class" : "Classes"} Pending` : "All Complete"}</span>
      </div>
      <div className="bg-slate-50/25 px-5 py-5 sm:px-6">
        <PendingAttendanceList classes={classes} todayLabel={todayLabel} />
      </div>
    </section>
  );
}
