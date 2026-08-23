import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingAttendanceList } from "@/components/dashboard/pending-attendance-list";
import { formatDatePK } from "@/lib/utils";
import type { PendingAttendanceClass } from "@/types/database";

export function PendingAttendanceCard({ classes, today }: { classes: PendingAttendanceClass[]; today: string }) {
  const todayLabel = formatDatePK(today);
  const count = classes.length;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Pending Attendance Today</CardTitle>
          <p className="mt-1 text-sm text-muted">{todayLabel}</p>
        </div>
        <Badge tone={count ? "yellow" : "green"}>
          {count ? `${count} ${count === 1 ? "Class" : "Classes"} Pending` : "All Complete"}
        </Badge>
      </CardHeader>
      <CardContent>
        <PendingAttendanceList classes={classes} todayLabel={todayLabel} />
      </CardContent>
    </Card>
  );
}
