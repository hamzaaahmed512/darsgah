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
  
  const { data: request, error: fetchError } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("id", requestId)
    .single();

  if (fetchError || !request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("Request has already been reviewed");

  const newStudentStatus = 
    decision === "approved" 
      ? (request.request_type === "admission" ? "active" : "cancelled")
      : (request.request_type === "admission" ? "pending_approval" : "active"); // Revert status if denied

  // Update student
  const { error: studentError } = await supabase
    .from("students")
    .update({ 
      status: newStudentStatus,
      ...(decision === "approved" && request.request_type === "cancellation" ? { archived_at: new Date().toISOString() } : {})
    })
    .eq("school_id", user.schoolId)
    .eq("id", request.student_id);

  if (studentError) throw new Error(studentError.message);

  if (decision === "approved" && request.request_type === "cancellation") {
    const { error: withdrawError } = await supabase
      .from("enrollments")
      .update({ status: "withdrawn", ends_on: new Date().toISOString().slice(0, 10) })
      .eq("school_id", user.schoolId)
      .eq("student_id", request.student_id)
      .eq("status", "active");

    if (withdrawError) throw new Error(withdrawError.message);
  }

  // On admission approval: create the enrollment if a class was requested
  if (decision === "approved" && request.request_type === "admission") {
    const requestedClassId = request.metadata?.requested_class_id as string | undefined;
    if (requestedClassId) {
      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("school_id", user.schoolId)
        .eq("is_active", true)
        .maybeSingle();

      const { error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          school_id: user.schoolId,
          student_id: request.student_id,
          class_id: requestedClassId,
          academic_year_id: activeYear?.id ?? null,
          status: "active"
        });

      if (enrollError) throw new Error(enrollError.message);
    }
  }

  // Update request
  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      denial_reason: decision === "denied" ? denialReason : null
    })
    .eq("id", requestId);

  if (updateError) throw new Error(updateError.message);

  await logActivity(
    user, 
    `request_${decision}`, 
    "approval_request", 
    requestId, 
    { request_type: request.request_type }
  );
}
