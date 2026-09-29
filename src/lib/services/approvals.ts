import { createClient } from "@/lib/supabase/server";
import type { AppUser, ApprovalRequestStatus } from "@/types/database";
import { logActivity } from "@/lib/services/activity";
import { formatDisplayName } from "@/lib/student-name";

export type ApprovalFilters = {
  status?: ApprovalRequestStatus | "all";
};

export async function getApprovalRequests(user: AppUser, filters: ApprovalFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("approval_requests")
    .select(`
      *,
      students!inner(first_name, last_name, admission_number),
      profiles!approval_requests_submitted_by_fkey(full_name),
      reviewer:profiles!approval_requests_reviewed_by_fkey(full_name)
    `)
    .eq("school_id", user.schoolId)
    .order("submitted_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else if (!filters.status) {
    query = query.eq("status", "pending"); // Default to pending
  }

  // If user is a student staff, they can only see requests they submitted or for their school if RLS allows
  if (user.role === "student_staff") {
    query = query.eq("submitted_by", user.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...row,
    student_first_name: row.students?.first_name,
    student_last_name: row.students?.last_name,
    student_admission_number: row.students?.admission_number,
    submitted_by_name: formatDisplayName(row.profiles?.full_name),
    reviewed_by_name: formatDisplayName(row.reviewer?.full_name),
  }));
}

export async function submitAdmissionRequest(user: AppUser, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("approval_requests").insert({
    school_id: user.schoolId,
    request_type: "admission",
    student_id: studentId,
    submitted_by: user.id,
    status: "pending"
  });

  if (error) throw new Error(error.message);
  await logActivity(user, "admission_request_submitted", "approval_request", studentId);
}

export async function submitCancellationRequest(user: AppUser, studentId: string) {
  const supabase = await createClient();
  
  // Update student status
  const { error: updateError } = await supabase
    .from("students")
    .update({ status: "pending_cancellation" })
    .eq("school_id", user.schoolId)
    .eq("id", studentId);
    
  if (updateError) throw new Error(updateError.message);

  // Insert request
  const { error } = await supabase.from("approval_requests").insert({
    school_id: user.schoolId,
    request_type: "cancellation",
    student_id: studentId,
    submitted_by: user.id,
    status: "pending"
  });

  if (error) throw new Error(error.message);
  await logActivity(user, "cancellation_request_submitted", "approval_request", studentId);
}

export async function reviewRequest(user: AppUser, requestId: string, decision: "approved" | "denied", denialReason?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_approval_request_atomic", {
    p_school_id: user.schoolId,
    p_request_id: requestId,
    p_decision: decision,
    p_denial_reason: denialReason ?? null
  });
  if (error) throw new Error(error.message);
}
