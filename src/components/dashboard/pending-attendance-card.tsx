import { Badge } from "@/components/ui/badge";
import { PendingAttendanceList } from "@/components/dashboard/pending-attendance-list";
import { formatDatePK } from "@/lib/utils";
import type { PendingAttendanceClass } from "@/types/database";
import { CalendarDays } from "lucide-react";

export function PendingAttendanceCard({ classes, today }: { classes: PendingAttendanceClass[]; today: string }) {
  const todayLabel = formatDatePK(today);
  const count = classes.length;

  return (
    <section className="rounded-[24px] border border-outline/70 bg-white shadow-card">
      <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-[1.45rem] font-bold tracking-tight text-ink">Pending Attendance Today</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            {todayLabel}
          </p>
        </div>
        <Badge tone={count ? "yellow" : "green"} className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
          {count ? `${count} ${count === 1 ? "Class" : "Classes"} Pending` : "All Complete"}
        </Badge>
      </div>
      <div className="px-5 pb-5">
        <PendingAttendanceList classes={classes} todayLabel={todayLabel} />
      </div>
    </section>
  );
}
