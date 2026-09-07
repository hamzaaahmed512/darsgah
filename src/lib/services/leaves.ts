import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/services/activity";
import { leaveRequestSchema, leaveReviewSchema, type LeaveRequestValues, type LeaveReviewValues } from "@/lib/validation/leaves";
import type { AppUser, StaffLeave, StaffLeaveStatus } from "@/types/database";
import { formatDisplayName } from "@/lib/student-name";

export const DEFAULT_ANNUAL_LEAVE_LIMIT = 36;
export const DEFAULT_MONTHLY_LEAVE_LIMIT = 3;

export function getDaysInRangeWithin(startDate: string, endDate: string, rangeStart: string, rangeEnd: string) {
  const start = new Date(startDate < rangeStart ? rangeStart : startDate);
  const end = new Date(endDate > rangeEnd ? rangeEnd : endDate);
  if (start > end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export interface LeavePolicy {
  annualLimit: number;
  monthlyLimit: number;
  weeklyLimit: number | null;
}

export async function getLeavePolicy(user: AppUser): Promise<LeavePolicy> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("school_settings")
    .select("settings")
    .eq("school_id", user.schoolId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const settings = (data?.settings ?? {}) as Record<string, any>;
  return {
    annualLimit: typeof settings.leave_annual_limit === "number" ? settings.leave_annual_limit : DEFAULT_ANNUAL_LEAVE_LIMIT,
    monthlyLimit: typeof settings.leave_monthly_limit === "number" ? settings.leave_monthly_limit : DEFAULT_MONTHLY_LEAVE_LIMIT,
    weeklyLimit: typeof settings.leave_weekly_limit === "number" ? settings.leave_weekly_limit : null
  };
}

export async function updateLeavePolicy(user: AppUser, policy: { annualLimit: number; monthlyLimit: number; weeklyLimit: number | null }) {
  if (!hasPermission(user.role, "leave:manage", user.permissions)) {
    throw new Error("Only administrators and principals can update the leave policy.");
  }
  if (!Number.isInteger(policy.annualLimit) || policy.annualLimit < 0) throw new Error("Annual limit must be a non-negative integer.");
  if (!Number.isInteger(policy.monthlyLimit) || policy.monthlyLimit < 0) throw new Error("Monthly limit must be a non-negative integer.");
  if (policy.weeklyLimit !== null && (!Number.isInteger(policy.weeklyLimit) || policy.weeklyLimit < 0)) throw new Error("Weekly limit must be a non-negative integer.");
  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from("school_settings")
    .select("settings")
    .eq("school_id", user.schoolId)
    .maybeSingle();
  const merged = {
    ...(existing?.settings ?? {}),
    leave_annual_limit: policy.annualLimit,
    leave_monthly_limit: policy.monthlyLimit,
    leave_weekly_limit: policy.weeklyLimit
  };
  const { error } = await adminClient
    .from("school_settings")
    .upsert({ school_id: user.schoolId, settings: merged });
  if (error) throw new Error(error.message);
}

export async function getTeacherLeaveStats(user: AppUser, teacherId: string) {
  const supabase = await createClient();
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${monthStr}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

  // Calculate week start (Monday) and week end (Sunday)
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStartObj = new Date(now);
  weekStartObj.setDate(now.getDate() + distanceToMonday);
  const weekStart = weekStartObj.toISOString().slice(0, 10);
  
  const weekEndObj = new Date(weekStartObj);
  weekEndObj.setDate(weekStartObj.getDate() + 6);
  const weekEnd = weekEndObj.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("staff_leaves")
    .select("start_date,end_date,status")
    .eq("school_id", user.schoolId)
    .eq("user_id", teacherId)
    .eq("status", "approved")
    .gte("start_date", yearStart)
    .lte("end_date", yearEnd);

  if (isMissingStaffLeavesTable(error)) return { annualUsed: 0, monthlyUsed: 0, weeklyUsed: 0, migrationRequired: true };
  if (error) throw new Error(error.message);

  let annualUsed = 0;
  let monthlyUsed = 0;
  let weeklyUsed = 0;
  for (const row of data ?? []) {
    const start = new Date(row.start_date);
    const end = new Date(row.end_date);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    annualUsed += days;
    if (row.start_date >= monthStart && row.start_date <= monthEnd) {
      monthlyUsed += days;
    }
    weeklyUsed += getDaysInRangeWithin(row.start_date, row.end_date, weekStart, weekEnd);
  }
  return { annualUsed, monthlyUsed, weeklyUsed, migrationRequired: false };
}

export async function getAllTeachersLeaveSummary(user: AppUser) {
  if (!hasPermission(user.role, "leave:manage", user.permissions)) {
    throw new Error("Only administrators and principals can view all teacher leave summaries.");
  }
  const policy = await getLeavePolicy(user);
  const supabase = await createClient();

  const [staffRes, leavesRes] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("user_id,full_name,role")
      .eq("school_id", user.schoolId)
      .in("role", ["teacher", "head_teacher"]),
    supabase
      .from("staff_leaves")
      .select("user_id,start_date,end_date")
      .eq("school_id", user.schoolId)
      .eq("status", "approved")
      .gte("start_date", `${new Date().getFullYear()}-01-01`)
  ]);

  if (staffRes.error) throw new Error(staffRes.error.message);
  
  if (isMissingStaffLeavesTable(leavesRes.error)) {
    return { summaries: [], migrationRequired: true };
  }
  if (leavesRes.error) throw new Error(leavesRes.error.message);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${monthStr}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStartObj = new Date(now);
  weekStartObj.setDate(now.getDate() + distanceToMonday);
  const weekStart = weekStartObj.toISOString().slice(0, 10);
  const weekEndObj = new Date(weekStartObj);
  weekEndObj.setDate(weekStartObj.getDate() + 6);
  const weekEnd = weekEndObj.toISOString().slice(0, 10);

  const leavesByUser = (leavesRes.data ?? []).reduce((acc: any, row: any) => {
    if (!acc[row.user_id]) acc[row.user_id] = { annualUsed: 0, monthlyUsed: 0, weeklyUsed: 0 };
    const start = new Date(row.start_date);
    const end = new Date(row.end_date);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    
    acc[row.user_id].annualUsed += days;
    if (row.start_date >= monthStart && row.start_date <= monthEnd) acc[row.user_id].monthlyUsed += days;
    acc[row.user_id].weeklyUsed += getDaysInRangeWithin(row.start_date, row.end_date, weekStart, weekEnd);
    
    return acc;
  }, {});

  const summaries = (staffRes.data ?? []).map((teacher) => {
    const stats = leavesByUser[teacher.user_id] || { annualUsed: 0, monthlyUsed: 0, weeklyUsed: 0 };
    return {
      teacherId: teacher.user_id,
      teacherName: formatDisplayName(teacher.full_name),
      annualLimit: policy.annualLimit,
      annualUsed: stats.annualUsed,
      annualRemaining: Math.max(0, policy.annualLimit - stats.annualUsed),
      monthlyLimit: policy.monthlyLimit,
      monthlyUsed: stats.monthlyUsed,
      monthlyRemaining: Math.max(0, policy.monthlyLimit - stats.monthlyUsed),
      weeklyLimit: policy.weeklyLimit,
      weeklyUsed: stats.weeklyUsed,
      weeklyRemaining: policy.weeklyLimit !== null ? Math.max(0, policy.weeklyLimit - stats.weeklyUsed) : null
    };
  });

  return { summaries: summaries.sort((a, b) => a.teacherName.localeCompare(b.teacherName)), migrationRequired: false };
}

function isMissingStaffLeavesTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || error?.message?.includes("public.staff_leaves");
}

function missingStaffLeavesMessage() {
  return "Staff leave workflows are not available because the latest School OS database migration has not been applied.";
}

export async function getMyLeaveRequests(user: AppUser) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_leaves")
    .select("*, reviewer:profiles!staff_leaves_reviewed_by_fkey(full_name)")
    .eq("school_id", user.schoolId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (isMissingStaffLeavesTable(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    ...row,
    reviewed_by_name: formatDisplayName(row.reviewer?.full_name) || null
  })) as StaffLeave[];
}

type LeaveDateRange = { from?: string; to?: string };

export async function getMyLeaveCenter(user: AppUser, range: LeaveDateRange = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("staff_leaves")
    .select("*, reviewer:profiles!staff_leaves_reviewed_by_fkey(full_name)")
    .eq("school_id", user.schoolId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (range.from) query = query.gte("end_date", range.from);
  if (range.to) query = query.lte("start_date", range.to);
  const { data, error } = await query;

  if (isMissingStaffLeavesTable(error)) {
    return {
      leaves: [] as StaffLeave[],
      migrationRequired: true
    };
  }

  if (error) throw new Error(error.message);

  return {
    leaves: (data ?? []).map((row: any) => ({
      ...row,
      reviewed_by_name: formatDisplayName(row.reviewer?.full_name) || null
    })) as StaffLeave[],
    migrationRequired: false
  };
}

export async function getLeaveRequestsForReview(user: AppUser, status: StaffLeaveStatus | "all" = "pending", range: LeaveDateRange = {}) {
  if (!hasPermission(user.role, "leave:manage", user.permissions)) throw new Error("Unauthorized to review leave requests.");
  const supabase = await createClient();
  let query = supabase
    .from("staff_leaves")
    .select("*, applicant:profiles!staff_leaves_user_id_fkey(full_name,email), reviewer:profiles!staff_leaves_reviewed_by_fkey(full_name)")
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (range.from) query = query.gte("end_date", range.from);
  if (range.to) query = query.lte("start_date", range.to);

  const { data, error } = await query;
  if (isMissingStaffLeavesTable(error)) return [];
  if (error) throw new Error(error.message);
  const mapped = (data ?? []).map((row: any) => ({
    ...row,
    applicant_name: formatDisplayName(row.applicant?.full_name) || row.applicant?.email || "Employee",
    reviewed_by_name: formatDisplayName(row.reviewer?.full_name) || null
  })) as StaffLeave[];

  return mapped.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function submitLeaveRequest(user: AppUser, values: LeaveRequestValues) {
  const parsed = leaveRequestSchema.parse(values);
  
  if (user.role === "teacher" || user.role === "head_teacher") {
    const policy = await getLeavePolicy(user);
    const stats = await getTeacherLeaveStats(user, user.id);
    
    if (!stats.migrationRequired) {
      const start = new Date(parsed.start_date);
      const end = new Date(parsed.end_date);
      const daysRequested = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      
      const now = new Date();
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const weekStartObj = new Date(now);
      weekStartObj.setDate(now.getDate() + distanceToMonday);
      const weekStart = weekStartObj.toISOString().slice(0, 10);
      const weekEndObj = new Date(weekStartObj);
      weekEndObj.setDate(weekStartObj.getDate() + 6);
      const weekEnd = weekEndObj.toISOString().slice(0, 10);

      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = `${monthStr}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

      let addedAnnual = daysRequested;
      let addedMonthly = 0;
      let addedWeekly = 0;

      if (parsed.start_date >= monthStart && parsed.start_date <= monthEnd) addedMonthly = daysRequested;
      addedWeekly = getDaysInRangeWithin(parsed.start_date, parsed.end_date, weekStart, weekEnd);

      if (stats.annualUsed >= policy.annualLimit || stats.annualUsed + addedAnnual > policy.annualLimit) {
        throw new Error("You have reached your allowed leave limit. You cannot apply for additional leaves.");
      }
      if (stats.monthlyUsed >= policy.monthlyLimit || stats.monthlyUsed + addedMonthly > policy.monthlyLimit) {
        throw new Error("You have reached your allowed leave limit. You cannot apply for additional leaves.");
      }
      if (policy.weeklyLimit !== null && addedWeekly > 0 && (stats.weeklyUsed >= policy.weeklyLimit || stats.weeklyUsed + addedWeekly > policy.weeklyLimit)) {
        throw new Error("This request exceeds the configured weekly leave limit. You cannot apply for additional leave this week.");
      }
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_leaves")
    .insert({
      school_id: user.schoolId,
      user_id: user.id,
      leave_type: parsed.leave_type,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      reason: parsed.reason,
      status: "pending",
      is_paid_leave: parsed.leave_type !== "unpaid"
    })
    .select("id")
    .single();

  if (isMissingStaffLeavesTable(error)) throw new Error(missingStaffLeavesMessage());
  if (error) throw new Error(error.message);
  await logActivity(user, "leave_request_submitted", "staff_leave", data.id, { leave_type: parsed.leave_type });
  return data.id as string;
}

export async function reviewLeaveRequest(user: AppUser, leaveId: string, values: LeaveReviewValues) {
  if (!hasPermission(user.role, "leave:manage", user.permissions)) throw new Error("Unauthorized to review leave requests.");
  const parsed = leaveReviewSchema.parse(values);
  const principalRemarks = parsed.principal_remarks?.trim() || (parsed.decision === "rejected" ? "" : null);
  const supabase = await createClient();
  const { data: leave, error: fetchError } = await supabase
    .from("staff_leaves")
    .select("id,status,user_id,leave_type,start_date,end_date")
    .eq("school_id", user.schoolId)
    .eq("id", leaveId)
    .maybeSingle();

  if (isMissingStaffLeavesTable(fetchError)) throw new Error(missingStaffLeavesMessage());
  if (fetchError) throw new Error(fetchError.message);
  if (!leave) throw new Error("Leave request not found.");
  if (leave.status !== "pending") throw new Error("Leave request has already been reviewed.");

  const { error } = await supabase
    .from("staff_leaves")
    .update({
      status: parsed.decision,
      principal_remarks: principalRemarks,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("school_id", user.schoolId)
    .eq("id", leaveId);

  if (isMissingStaffLeavesTable(error)) throw new Error(missingStaffLeavesMessage());
  if (error) throw new Error(error.message);

  if (parsed.decision === "rejected") {
    const today = new Date().toISOString().slice(0, 10);
    const { error: notificationError } = await supabase.from("announcements").insert({
      school_id: user.schoolId,
      title: "Leave request rejected",
      description: principalRemarks || "Your leave request was rejected without an additional reason.",
      priority: "high",
      type: "urgent",
      audience_type: "roles",
      audience_value: `user:${leave.user_id}`,
      publish_date: today,
      expiry_date: null,
      created_by: user.id
    });
    if (notificationError) throw new Error(`Leave was rejected, but the notification could not be sent: ${notificationError.message}`);
  }

  await logActivity(user, `leave_${parsed.decision}`, "staff_leave", leaveId, { principal_remarks: principalRemarks || null });
}
