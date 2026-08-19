import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/services/activity";
import { leaveRequestSchema, leaveReviewSchema, type LeaveRequestValues, type LeaveReviewValues } from "@/lib/validation/leaves";
import type { AppUser, StaffLeave, StaffLeaveStatus } from "@/types/database";

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
    reviewed_by_name: row.reviewer?.full_name ?? null
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
      reviewed_by_name: row.reviewer?.full_name ?? null
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
  return (data ?? []).map((row: any) => ({
    ...row,
    applicant_name: row.applicant?.full_name ?? row.applicant?.email ?? "Employee",
    reviewed_by_name: row.reviewer?.full_name ?? null
  })) as StaffLeave[];
}

export async function submitLeaveRequest(user: AppUser, values: LeaveRequestValues) {
  const parsed = leaveRequestSchema.parse(values);
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
  const supabase = await createClient();
  const { data: leave, error: fetchError } = await supabase
    .from("staff_leaves")
    .select("id,status")
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
      principal_remarks: parsed.principal_remarks || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("school_id", user.schoolId)
    .eq("id", leaveId);

  if (isMissingStaffLeavesTable(error)) throw new Error(missingStaffLeavesMessage());
  if (error) throw new Error(error.message);
  await logActivity(user, `leave_${parsed.decision}`, "staff_leave", leaveId, { principal_remarks: parsed.principal_remarks || null });
}
