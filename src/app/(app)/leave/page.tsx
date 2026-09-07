import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { LeaveApplicationDialog } from "@/components/leave/leave-application-dialog";
import { LeavePeriodFilters } from "@/components/leave/leave-period-filters";
import { LeaveReviewActions } from "@/components/leave/leave-review-actions";
import { CsvExport } from "@/components/reports/csv-export";
import { requireUser } from "@/lib/auth/session";
import { getLeavePolicy, getLeaveRequestsForReview, getMyLeaveCenter, getTeacherLeaveStats, getAllTeachersLeaveSummary } from "@/lib/services/leaves";
import { hasPermission } from "@/lib/permissions";
import { submitLeaveAction, updateLeavePolicyAction } from "@/app/(app)/leave/actions";
import { CalendarRange, FileText, Settings2, Users } from "lucide-react";

const statusTone = {
  pending: "yellow",
  approved: "green",
  rejected: "red"
} as const;

type LeaveRangeMode = "month" | "year" | "lifetime" | "custom";

function getLeaveRange(params: Record<string, string | undefined>) {
  const dateParts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, item) => ({ ...parts, [item.type]: item.value }), {});
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);
  const mode: LeaveRangeMode = params.range === "year" || params.range === "custom" || params.range === "lifetime" ? params.range : "month";
  const month = currentMonth;
  const year = currentYear;

  if (mode === "year") return { mode, month, year, from: `${year}-01-01`, to: `${year}-12-31` };
  if (mode === "lifetime") return { mode, month, year, from: "", to: "" };
  if (mode === "custom") {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : `${currentMonth}-01`;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : today;
    return { mode, month, year, from: from <= to ? from : to, to: from <= to ? to : from };
  }
  const [monthYear, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate();
  return { mode, month, year, from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export default async function LeavePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const range = getLeaveRange(params);
  const user = await requireUser("leave:view");
  const canReviewLeaves = hasPermission(user.role, "leave:manage", user.permissions);
  const reviewLeaves = canReviewLeaves ? await getLeaveRequestsForReview(user, "all", range) : [];
  const leaveCenter = canReviewLeaves ? { leaves: [], migrationRequired: false } : await getMyLeaveCenter(user, range);
  const { leaves, migrationRequired } = leaveCenter;
  const leavePolicy = await getLeavePolicy(user).catch(() => ({ annualLimit: 36, monthlyLimit: 3, weeklyLimit: 1 }));
  const teacherLeaveStats = !canReviewLeaves ? await getTeacherLeaveStats(user, user.id).catch(() => null) : null;
  const teacherLeaveSummary = canReviewLeaves ? await getAllTeachersLeaveSummary(user).catch(() => ({ summaries: [], migrationRequired: false })) : { summaries: [], migrationRequired: false };
  const exportDate = new Date().toISOString().slice(0, 10);
  const reviewExportRows = reviewLeaves.map((leave) => ({
    Staff: (leave as any).applicant_name ?? "Employee",
    Type: leave.leave_type.replace(/_/g, " "),
    "Start date": leave.start_date,
    "End date": leave.end_date,
    Reason: leave.reason,
    Status: leave.status,
    Remarks: leave.principal_remarks ?? "",
    "Reviewed by": (leave as any).reviewed_by_name ?? ""
  }));
  const personalExportRows = leaves.map((leave) => ({
    Type: leave.leave_type.replace(/_/g, " "),
    "Start date": leave.start_date,
    "End date": leave.end_date,
    Reason: leave.reason,
    Status: leave.status,
    Remarks: leave.principal_remarks ?? ""
  }));

  return (
    <>
      <PageHeader
        eyebrow="Employee portal"
        title="Leave Center"
        description={canReviewLeaves ? "Review staff leave requests and make approval decisions." : "Submit leave requests and track Principal review status."}
        actions={
          !canReviewLeaves ? (
            <LeaveApplicationDialog migrationRequired={migrationRequired} />
          ) : null
        }
      />

      {canReviewLeaves ? (
        <>
          {/* Leave Policy Card */}
          <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
              <CardHeader className="gap-4 border-b border-outline/50 pb-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                    <Settings2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-[1.8rem]">Leave Policy</CardTitle>
                    <p className="mt-1 text-base text-muted">Set the annual and monthly leave limits applied to all staff.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form action={updateLeavePolicyAction} className="flex flex-wrap items-end gap-4">
                  <Field label="Annual leave limit (days)">
                    <Input
                      name="annual_limit"
                      type="number"
                      min="0"
                      defaultValue={leavePolicy.annualLimit}
                      className="w-32"
                      required
                    />
                  </Field>
                  <Field label="Monthly leave limit (days)">
                    <Input
                      name="monthly_limit"
                      type="number"
                      min="0"
                      defaultValue={leavePolicy.monthlyLimit}
                      className="w-32"
                      required
                    />
                  </Field>
                  <Field label="Weekly leave limit (days) [Optional]">
                    <Input
                      name="weekly_limit"
                      type="number"
                      min="0"
                      defaultValue={leavePolicy.weeklyLimit ?? ""}
                      placeholder="e.g. 1 (Leave blank for no limit)"
                      className="w-[260px]"
                    />
                  </Field>
                  <div className="pb-[2px]">
                    <Button type="submit">Save limits</Button>
                  </div>
                </form>
                <p className="mt-3 text-xs text-muted">
                  Current limits: <strong>{leavePolicy.annualLimit}</strong> days/year &middot; <strong>{leavePolicy.monthlyLimit}</strong> days/month &middot; <strong>{leavePolicy.weeklyLimit ?? "N/A"}</strong> days/week.
                </p>
              </CardContent>
            </Card>

          {/* Teacher Leave Usage Table (Principal/Admin) */}
          <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
            <CardHeader className="gap-4 border-b border-outline/50 pb-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-[1.8rem]">Teacher Leave Usage</CardTitle>
                  <p className="mt-1 text-base text-muted">Monitor leave limits and usage across all teaching staff.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teacherLeaveSummary.migrationRequired ? (
                <EmptyState title="Leave data unavailable" description="The hosted database does not have the staff leave table yet." />
              ) : !teacherLeaveSummary.summaries.length ? (
                <EmptyState title="No teachers found" description="There are no teachers to show leave tracking for." />
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-outline/50">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50/80 font-label text-xs uppercase tracking-[0.14em] text-muted">
                        <tr>
                          <th className="px-5 py-4">Teacher Name</th>
                          <th className="px-5 py-4">Annual (Used/Limit)</th>
                          <th className="px-5 py-4">Monthly (Used/Limit)</th>
                          <th className="px-5 py-4">Weekly (Used/Limit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherLeaveSummary.summaries.map((s) => (
                          <tr key={s.teacherId} className="border-t border-outline/50">
                            <td className="px-5 py-4 font-semibold">{s.teacherName}</td>
                            <td className="px-5 py-4">
                              <span className={s.annualUsed > s.annualLimit ? "font-semibold text-red-600" : ""}>{s.annualUsed}</span> / {s.annualLimit}
                            </td>
                            <td className="px-5 py-4">
                              <span className={s.monthlyUsed > s.monthlyLimit ? "font-semibold text-red-600" : ""}>{s.monthlyUsed}</span> / {s.monthlyLimit}
                            </td>
                            <td className="px-5 py-4">
                              {s.weeklyLimit === null ? (
                                <span className="text-muted">N/A</span>
                              ) : (
                                <>
                                  <span className={s.weeklyUsed > s.weeklyLimit ? "font-semibold text-red-600" : ""}>{s.weeklyUsed}</span> / {s.weeklyLimit}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Leave Requests Card */}
          <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
            <CardHeader className="gap-4 border-b border-outline/50 pb-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                <CalendarRange className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-[1.8rem]">Staff Leave Requests</CardTitle>
                <p className="mt-1 text-base text-muted">View, filter and manage leave requests.</p>
              </div>
            </div>
            <CsvExport rows={reviewExportRows} filename={`staff-leave-requests-${exportDate}.csv`} />
          </CardHeader>
          <CardContent>
            <LeavePeriodFilters mode={range.mode} from={params.from ?? range.from} to={params.to ?? range.to} />
            {!reviewLeaves.length ? (
              <EmptyState title="No leave requests" description="Staff leave requests will appear here for approval." />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-outline/50">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50/80 font-label text-xs uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th className="px-5 py-4">Staff</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Dates</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewLeaves.map((leave) => (
                      <tr key={leave.id} className="border-t border-outline/50 align-top">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getAvatarToneClasses((leave as any).applicant_name ?? "Employee")}`}>
                              {getInitials((leave as any).applicant_name ?? "Employee")}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-ink">{(leave as any).applicant_name ?? "Employee"}</p>
                              <p className="mt-0.5 text-xs text-muted">Leave request</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold capitalize">{leave.leave_type.replace("_", " ")}</td>
                        <td className="px-5 py-4 text-muted">{leave.start_date} to {leave.end_date}</td>
                        <td className="max-w-sm px-5 py-4 text-muted">{leave.reason}</td>
                        <td className="px-5 py-4">
                          <Badge tone={statusTone[leave.status]}>{leave.status}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          {leave.status === "pending" ? (
                            <LeaveReviewActions leaveId={leave.id} />
                          ) : (
                            <p className="text-right text-xs font-semibold leading-5 text-muted">
                              Reviewed by <span className="text-ink">{(leave as any).reviewed_by_name ?? "reviewer"}</span>
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-outline/50 px-5 py-4 text-sm text-muted">
                  <p>Showing 1 to {reviewLeaves.length} of {reviewLeaves.length} requests</p>
                  <div className="flex items-center gap-2">
                    <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline/60 bg-white text-muted" disabled>
                      ‹
                    </button>
                    <button type="button" className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary-soft px-3 font-semibold text-primary">
                      1
                    </button>
                    <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline/60 bg-white text-muted" disabled>
                      ›
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      ) : (
        <>
          {/* Leave Balance Card for employees */}
          {teacherLeaveStats && !teacherLeaveStats.migrationRequired ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <LeaveBalanceCard
                label="Annual leave"
                used={teacherLeaveStats.annualUsed}
                limit={leavePolicy.annualLimit}
                description={`${new Date().getFullYear()} total`}
              />
              <LeaveBalanceCard
                label="Monthly leave"
                used={teacherLeaveStats.monthlyUsed}
                limit={leavePolicy.monthlyLimit}
                description={new Date().toLocaleString("en", { month: "long", year: "numeric" })}
              />
              <LeaveBalanceCard
                label="Weekly leave"
                used={teacherLeaveStats.weeklyUsed}
                limit={leavePolicy.weeklyLimit}
                description="This week"
              />
            </div>
          ) : null}

          <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
          <CardHeader className="gap-4 border-b border-outline/50 pb-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-[1.8rem]">My Leave History</CardTitle>
                <p className="mt-1 text-base text-muted">Review your submitted leave requests and their latest status.</p>
              </div>
            </div>
            <CsvExport rows={personalExportRows} filename={`my-leave-history-${exportDate}.csv`} />
          </CardHeader>
          <CardContent>
            <LeavePeriodFilters mode={range.mode} from={params.from ?? range.from} to={params.to ?? range.to} />
            {migrationRequired ? (
              <EmptyState title="Leave history unavailable" description="The hosted database does not have the staff leave table yet." />
            ) : !leaves.length ? (
              <EmptyState title="No leave requests yet" description="Submitted leave requests will appear here with their latest status." />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-outline/50">
                <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50/80 font-label text-xs uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Dates</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="border-t border-outline/50">
                        <td className="px-5 py-4 font-semibold capitalize">{leave.leave_type.replace("_", " ")}</td>
                        <td className="px-5 py-4 text-muted">{leave.start_date} to {leave.end_date}</td>
                        <td className="px-5 py-4">
                          <Badge tone={statusTone[leave.status]}>{leave.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarToneClasses(name: string) {
  const tones = [
    "border-blue-100 bg-blue-50 text-blue-600",
    "border-emerald-100 bg-emerald-50 text-emerald-600",
    "border-violet-100 bg-violet-50 text-violet-600",
    "border-amber-100 bg-amber-50 text-amber-600"
  ];
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}


function LeaveBalanceCard({
  label,
  used,
  limit,
  description
}: {
  label: string;
  used: number;
  limit: number | null;
  description: string;
}) {
  const isUnlimited = limit === null;
  const remaining = isUnlimited ? "N/A" : Math.max(0, limit - used);
  const over = !isUnlimited && used > limit;
  const pct = isUnlimited ? 0 : Math.min(100, limit > 0 ? (used / limit) * 100 : 0);
  return (
    <div className="rounded-[24px] border border-outline/70 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
          <div className="mt-1 flex items-end gap-1.5">
            <span className={`font-display text-3xl font-bold ${over ? "text-red-600" : "text-ink"}`}>
              {remaining}
            </span>
            <span className="mb-0.5 text-sm text-muted">/ {isUnlimited ? "N/A" : limit} remaining</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{used} days taken &middot; {description}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold ${
            isUnlimited
              ? "border-slate-100 bg-slate-50 text-slate-400"
              : over
              ? "border-red-100 bg-red-50 text-red-600"
              : remaining === 0
              ? "border-amber-100 bg-amber-50 text-amber-600"
              : "border-emerald-100 bg-emerald-50 text-emerald-600"
          }`}
        >
          {remaining}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            isUnlimited ? "bg-slate-200" : over ? "bg-red-400" : remaining === 0 ? "bg-amber-400" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
