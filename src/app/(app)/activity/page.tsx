import { formatDistanceToNow, isToday } from "date-fns";
import { Activity, Clock3, ScrollText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { formatDisplayName } from "@/lib/student-name";
import { getActivityLogs } from "@/lib/services/reports";

export default async function ActivityPage() {
  const user = await requireUser("activity:view");
  const activity = await getActivityLogs(user);
  const distinctActors = new Set(activity.map((item: any) => item.profiles?.full_name).filter(Boolean)).size;
  const todayCount = activity.filter((item: any) => isToday(new Date(item.created_at))).length;
  const actionTypes = new Set(activity.map((item: any) => item.action)).size;

  return (
    <>
      <PageHeader eyebrow="System audit" title="Activity logs" description="A complete record of important actions across your school workspace." />

      <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Activity log summary">
        <AuditSummary icon={ScrollText} label="Recorded events" value={activity.length} detail="Most recent 50 events" tone="blue" />
        <AuditSummary icon={Clock3} label="Today" value={todayCount} detail="Events recorded today" tone="green" />
        <AuditSummary icon={Users} label="Active contributors" value={distinctActors} detail={`${actionTypes} action type${actionTypes === 1 ? "" : "s"} recorded`} tone="violet" />
      </section>

      <section aria-labelledby="activity-list-heading">
        <Card className="overflow-hidden border border-outline/70 shadow-soft">
          <CardHeader className="border-b border-outline/70 bg-surface-low p-5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-button">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-primary">Audit trail</p>
                <CardTitle id="activity-list-heading" className="mt-0.5 text-lg">All recent activity</CardTitle>
              </div>
            </div>
            <p className="text-sm text-muted">Latest events first</p>
          </CardHeader>
          <CardContent className="p-0">
            {activity.length ? (
              <ol className="divide-y divide-outline/70">
                {activity.map((item: any) => (
                  <li key={item.id} className="group flex gap-4 px-5 py-4 transition-colors hover:bg-surface-low sm:px-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/10">
                      <Activity className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{humanizeAction(item.action)}</p>
                        {item.entity_type ? <span className="rounded-md bg-surface-mid px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">{humanizeAction(item.entity_type)}</span> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted">{formatDisplayName(item.profiles?.full_name) || "System"}</p>
                    </div>
                    <time className="shrink-0 pt-0.5 text-right text-xs font-medium text-muted" dateTime={item.created_at}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-ink">No activity recorded yet</p>
                <p className="mt-1 text-sm text-muted">System actions will appear here as they happen.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

const summaryTones = {
  blue: "bg-primary-soft text-primary ring-primary/10",
  green: "bg-success-soft text-success ring-success/10",
  violet: "bg-violet-50 text-violet-600 ring-violet-100"
} as const;

function AuditSummary({ icon: Icon, label, value, detail, tone }: { icon: typeof Activity; label: string; value: number; detail: string; tone: keyof typeof summaryTones }) {
  return (
    <Card className="border border-outline/70 p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${summaryTones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold leading-none text-ink">{value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function humanizeAction(action: string) {
  return action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
