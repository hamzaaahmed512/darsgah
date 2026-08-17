import { createClient } from "@/lib/supabase/server";
import type { AppUser, SalaryAdjustment, TeacherEmploymentDetails } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { payrollGenerationSchema } from "@/lib/validation/finance";

function isMissingPayrollLeaveFlagsView(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || error?.message?.includes("public.payroll_unpaid_leave_flags");
}

// ─── Employment Details ────────────────────────────────────────────────────────

export async function getTeacherEmploymentDetails(user: AppUser, teacherId?: string) {
  const supabase = await createClient();
  const targetId = teacherId ?? user.id;

  // Teachers can only view their own details
  if (user.role === "teacher" && targetId !== user.id) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("teacher_employment_details")
    .select("*")
    .eq("teacher_id", targetId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as TeacherEmploymentDetails | null;
}

export async function upsertTeacherEmploymentDetails(
  user: AppUser,
  teacherId: string,
  values: Partial<Omit<TeacherEmploymentDetails, "teacher_id" | "school_id" | "created_at" | "updated_at">>
) {
  if (!hasPermission(user.role, "payroll:manage")) {
    throw new Error("Unauthorized to manage payroll");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_employment_details").upsert({
    teacher_id: teacherId,
    school_id: user.schoolId,
    ...values
  });
  if (error) throw new Error(error.message);
}

// ─── Salary History ────────────────────────────────────────────────────────────

export async function getSalaryHistory(user: AppUser, teacherId?: string) {
  const supabase = await createClient();
  const targetId = teacherId ?? user.id;

  if (user.role === "teacher" && targetId !== user.id) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("salary_history")
    .select("*, profiles!salary_history_approved_by_fkey(full_name)")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", targetId)
    .order("effective_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    ...row,
    approved_by_name: row.profiles?.full_name ?? null
  }));
}

export async function recordSalaryChange(
  user: AppUser,
  teacherId: string,
  previousSalary: number,
  newSalary: number,
  actionType: "initial" | "increase" | "decrease",
  effectiveDate: string,
  remarks?: string
) {
  if (!hasPermission(user.role, "payroll:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase.from("salary_history").insert({
    school_id: user.schoolId,
    teacher_id: teacherId,
    previous_salary: previousSalary,
    new_salary: newSalary,
    action_type: actionType,
    effective_date: effectiveDate,
    approved_by: user.id,
    remarks: remarks ?? null
  });
  if (error) throw new Error(error.message);
}

// ─── Salary Adjustments ────────────────────────────────────────────────────────

export async function getSalaryAdjustments(user: AppUser, teacherId?: string, month?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("salary_adjustments")
    .select("*, profiles!salary_adjustments_teacher_id_fkey(full_name, avatar_url)")
    .eq("school_id", user.schoolId)
    .order("effective_date", { ascending: false });

  if (user.role === "teacher") {
    query = query.eq("teacher_id", user.id);
  } else if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  if (month) {
    // Filter by month YYYY-MM
    query = query
      .gte("effective_date", `${month}-01`)
      .lt("effective_date", getNextMonth(month));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    ...row,
    teacher_name: row.profiles?.full_name ?? null
  }));
}

export async function createSalaryAdjustment(
  user: AppUser,
  values: Pick<SalaryAdjustment, "teacher_id" | "amount" | "type" | "reason" | "effective_date">
) {
  if (!hasPermission(user.role, "payroll:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase.from("salary_adjustments").insert({
    school_id: user.schoolId,
    teacher_id: values.teacher_id,
    amount: values.amount,
    type: values.type,
    reason: values.reason,
    effective_date: values.effective_date,
    approved_by: user.id
  });
  if (error) throw new Error(error.message);
}

export async function deleteSalaryAdjustment(user: AppUser, adjustmentId: string) {
  if (!hasPermission(user.role, "payroll:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase
    .from("salary_adjustments")
    .delete()
    .eq("id", adjustmentId)
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);
}

// ─── Payroll ───────────────────────────────────────────────────────────────────

export async function getPayrollList(user: AppUser, month?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("payroll")
    .select("*, profiles!payroll_teacher_id_fkey(full_name, email, avatar_url)")
    .eq("school_id", user.schoolId)
    .order("month", { ascending: false });

  if (user.role === "teacher") {
    query = query.eq("teacher_id", user.id);
  }

  if (month) {
    query = query.eq("month", month);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    ...row,
    teacher_name: row.profiles?.full_name ?? null,
    teacher_email: row.profiles?.email ?? null
  }));
}

export async function getPayrollDashboardStats(user: AppUser, month: string) {
  if (!hasPermission(user.role, "payroll:view")) throw new Error("Unauthorized");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll")
    .select("net_salary, status, total_bonus, total_deductions, base_salary")
    .eq("school_id", user.schoolId)
    .eq("month", month);

  if (error) throw new Error(error.message);
  const rows = data || [];

  return {
    totalTeachers: rows.length,
    totalPayroll: rows.reduce((s, r) => s + Number(r.net_salary), 0),
    totalBonuses: rows.reduce((s, r) => s + Number(r.total_bonus), 0),
    totalDeductions: rows.reduce((s, r) => s + Number(r.total_deductions), 0),
    totalBaseSalary: rows.reduce((s, r) => s + Number(r.base_salary), 0),
    paidCount: rows.filter((r) => r.status === "paid").length,
    generatedCount: rows.filter((r) => r.status === "generated").length
  };
}

export async function getApprovedUnpaidLeaveFlags(user: AppUser, month: string) {
  if (!hasPermission(user.role, "payroll:view", user.permissions)) throw new Error("Unauthorized");
  const supabase = await createClient();
  const monthStart = `${month}-01`;
  const nextMonthStart = getNextMonth(month);
  const { data, error } = await supabase
    .from("payroll_unpaid_leave_flags")
    .select("*")
    .eq("school_id", user.schoolId)
    .lt("start_date", nextMonthStart)
    .gte("end_date", monthStart)
    .order("start_date", { ascending: false });

  if (isMissingPayrollLeaveFlagsView(error)) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPayrollEligibleStaff(user: AppUser) {
  if (!hasPermission(user.role, "payroll:manage", user.permissions)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_directory")
    .select("user_id, full_name, email")
    .eq("school_id", user.schoolId).eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({ id: row.user_id, name: row.full_name ?? "Unknown", email: row.email ?? "" }));
}

export async function generateMonthlyPayroll(user: AppUser, month: string, teacherId?: string) {
  if (!hasPermission(user.role, "payroll:manage")) throw new Error("Unauthorized");
  const parsed = payrollGenerationSchema.parse({ month, teacher_id: teacherId });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_monthly_payroll", {
    p_school_id: user.schoolId,
    p_month: parsed.month,
    p_actor_id: user.id,
    p_teacher_id: parsed.teacher_id ?? null
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

export async function markPayrollPaid(user: AppUser, payrollId: string) {
  if (!hasPermission(user.role, "payroll:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase
    .from("payroll")
    .update({ status: "paid", payment_date: new Date().toISOString().split("T")[0] })
    .eq("id", payrollId)
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getNextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const next = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
  return `${next}-01`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-PK", { month: "long", year: "numeric" });
}
