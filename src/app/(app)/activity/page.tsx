import { formatDistanceToNow, isToday } from "date-fns";
import { Activity, CheckCircle2, Clock3, ScrollText, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/session";
import { formatDisplayName } from "@/lib/student-name";
import { getActivityLogs } from "@/lib/services/reports";
import { StudentPagination } from "@/components/students/student-pagination";
import { paginateRows } from "@/lib/pagination";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("activity:view");
  const activity = await getActivityLogs(user);
  const paginatedActivity = paginateRows(activity, params.page, params.pageSize);
  const distinctActors = new Set(activity.map((item: any) => item.profiles?.full_name).filter(Boolean)).size;
  const todayCount = activity.filter((item: any) => isToday(new Date(item.created_at))).length;
  const actionTypes = new Set(activity.map((item: any) => item.action)).size;

  return (
    <>
      <PageHeader eyebrow="System audit" title="Activity logs" description="A complete record of important actions across your school workspace." />

      <section className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Activity log summary">
        <StatCard icon={ScrollText} label="Recorded Events" value={activity.length} hint="Most recent 50 events" tone="blue" />
        <StatCard icon={Clock3} label="Today" value={todayCount} hint="Events recorded today" tone="amber" />
        <StatCard icon={Users} label="Active Contributors" value={distinctActors} hint={`${actionTypes} action type${actionTypes === 1 ? "" : "s"} recorded`} tone="purple" />
      </section>

      <div className="min-w-0 overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]" aria-labelledby="activity-list-heading">
        <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
          <h2 id="activity-list-heading" className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />All Recent Activity
          </h2>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
            {paginatedActivity.count} event{paginatedActivity.count === 1 ? "" : "s"}
          </span>
        </div>

        {paginatedActivity.rows.length ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">Entity</th>
                    <th className="px-6 py-4 font-semibold">Performed By</th>
                    <th className="px-6 py-4 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivity.rows.map((item: any) => (
                    <tr key={item.id} className="border-t border-slate-100 transition hover:bg-blue-50/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <Activity className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="font-semibold text-ink">{humanizeAction(item.action)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.entity_type ? (
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                            {humanizeAction(item.entity_type)}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-slate-700">
                            {formatDisplayName(item.profiles?.full_name) || "System"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        <time dateTime={item.created_at}>
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 p-4 lg:hidden">
              {paginatedActivity.rows.map((item: any) => (
                <article key={item.id} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Activity className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{humanizeAction(item.action)}</p>
                        <p className="text-xs text-muted mt-0.5">{formatDisplayName(item.profiles?.full_name) || "System"}</p>
                      </div>
                    </div>
                    {item.entity_type ? (
                      <span className="inline-flex shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        {humanizeAction(item.entity_type)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-muted border-t border-slate-100 pt-2">
                    <time dateTime={item.created_at}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </time>
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-ink">No activity recorded yet</p>
            <p className="mt-1 text-sm text-muted">System actions will appear here as they happen.</p>
          </div>
        )}

        {activity.length ? <StudentPagination count={paginatedActivity.count} page={paginatedActivity.page} pageSize={paginatedActivity.pageSize} itemLabel="events" /> : null}
      </div>
    </>
  );
}

function humanizeAction(action: string) {
  return action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
