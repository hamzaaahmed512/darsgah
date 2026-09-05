import { createClient } from "@/lib/supabase/server";
import type { AppUser, PayrollStatus, SalaryAdjustment, TeacherEmploymentDetails } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { payrollGenerationSchema } from "@/lib/validation/finance";
import { formatDisplayName } from "@/lib/student-name";

function isMissingPayrollLeaveFlagsView(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || error?.message?.includes("public.payroll_unpaid_leave_flags");
}

function assertPayrollPortalAccess(user: AppUser) {
  if (user.role === "teacher" || user.role === "head_teacher") {
    throw new Error("Teachers cannot access payroll.");
  }
}

// ─── Employment Details ────────────────────────────────────────────────────────

export async function getTeacherEmploymentDetails(user: AppUser, teacherId?: string) {
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
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
    approved_by_name: formatDisplayName(row.profiles?.full_name) || null
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
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
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
    teacher_name: formatDisplayName(row.profiles?.full_name) || null
  }));
}

export function findNextUnpaidPayrollMonth(
  payrolls: Array<{ month: string; status: string }>,
  effectiveDate: string
): string | null {
  const month = effectiveDate.slice(0, 7);
  const nextPayable = (payrolls ?? [])
    .filter((row) => row.month >= month && row.status !== "paid")
    .sort((a, b) => a.month.localeCompare(b.month))[0];
  return nextPayable?.month ?? null;
}

export async function createSalaryAdjustment(
  user: AppUser,
  values: Pick<SalaryAdjustment, "teacher_id" | "amount" | "type" | "reason" | "effective_date">
) {
  assertPayrollPortalAccess(user);
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

  const effectiveMonth = values.effective_date.slice(0, 7);
  const { data: payrollRows, error: payrollRowsError } = await supabase
    .from("payroll")
    .select("id, base_salary, status, month")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", values.teacher_id)
    .gte("month", effectiveMonth)
    .order("month", { ascending: true });
  if (payrollRowsError) throw new Error(payrollRowsError.message);

  const targetMonth = findNextUnpaidPayrollMonth(payrollRows ?? [], values.effective_date);
  if (!targetMonth) return;

  const targetPayroll = (payrollRows ?? []).find((row) => row.month === targetMonth);
  if (!targetPayroll || targetPayroll.status === "paid") return;

  const { data: adjustments, error: adjustmentError } = await supabase
    .from("salary_adjustments")
    .select("amount, type")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", values.teacher_id)
    .gte("effective_date", `${targetMonth}-01`)
    .lt("effective_date", getNextMonth(targetMonth));
  if (adjustmentError) throw new Error(adjustmentError.message);

  const bonus = (adjustments ?? []).filter((row) => row.type === "bonus").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const deduction = (adjustments ?? []).filter((row) => row.type === "deduction").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const baseSalary = Number(targetPayroll.base_salary ?? 0);
  const { error: payrollUpdateError } = await supabase
    .from("payroll")
    .update({
      total_bonus: bonus,
      total_deductions: deduction,
      net_salary: Math.max(0, baseSalary + bonus - deduction)
    })
    .eq("id", targetPayroll.id)
    .eq("school_id", user.schoolId);
  if (payrollUpdateError) throw new Error(payrollUpdateError.message);
}

export async function deleteSalaryAdjustment(user: AppUser, adjustmentId: string) {
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
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
    teacher_name: formatDisplayName(row.profiles?.full_name) || null,
    teacher_email: row.profiles?.email ?? null
  }));
}

export async function getPayrollDashboardStats(user: AppUser, month: string) {
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
  if (!hasPermission(user.role, "payroll:manage", user.permissions)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_directory")
    .select("user_id, full_name, email, role")
    .eq("school_id", user.schoolId).eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.user_id,
    name: formatDisplayName(row.full_name) || "Unknown",
    email: row.email ?? "",
    role: row.role ?? "staff"
  }));
}

export async function generateMonthlyPayroll(user: AppUser, month: string, teacherId?: string) {
  assertPayrollPortalAccess(user);
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
  assertPayrollPortalAccess(user);
  if (!hasPermission(user.role, "payroll:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase
    .from("payroll")
    .update({ status: "paid", payment_date: new Date().toISOString().split("T")[0] })
    .eq("id", payrollId)
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);
}

export type StaffPayRow = {
  staffId: string;
  name: string;
  email: string | null;
  role: string;
  jobTitle: string | null;
  baseSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  status: "unpaid" | "paid";
  paymentDate: string | null;
  remarks: string | null;
  payrollId: string | null;
  yearlyPaidTotal: number;
};

export async function getStaffPayRows(user: AppUser, month: string): Promise<StaffPayRow[]> {
  assertPayrollPortalAccess(user);
  if (!hasPermission(user.role, "payroll:view", user.permissions)) throw new Error("Unauthorized");
  const supabase = await createClient();
  const year = month.slice(0, 4);

  const [staffRes, employmentRes, payrollRes, adjustmentRes, yearPaidRes] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("user_id, full_name, email, role, job_title")
      .eq("school_id", user.schoolId)
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("teacher_employment_details")
      .select("teacher_id, monthly_salary")
      .eq("school_id", user.schoolId),
    supabase
      .from("payroll")
      .select("*")
      .eq("school_id", user.schoolId)
      .eq("month", month),
    supabase
      .from("salary_adjustments")
      .select("teacher_id, amount, type")
      .eq("school_id", user.schoolId)
      .gte("effective_date", `${month}-01`)
      .lt("effective_date", getNextMonth(month)),
    supabase
      .from("payroll")
      .select("teacher_id, net_salary")
      .eq("school_id", user.schoolId)
      .eq("status", "paid")
      .gte("month", `${year}-01`)
      .lte("month", `${year}-12`)
  ]);

  if (staffRes.error) throw new Error(staffRes.error.message);
  if (employmentRes.error) throw new Error(employmentRes.error.message);
  if (payrollRes.error) throw new Error(payrollRes.error.message);
  if (adjustmentRes.error) throw new Error(adjustmentRes.error.message);
  if (yearPaidRes.error) throw new Error(yearPaidRes.error.message);

  const employmentByStaff = new Map((employmentRes.data ?? []).map((row: any) => [row.teacher_id, Number(row.monthly_salary ?? 0)]));
  const payrollByStaff = new Map((payrollRes.data ?? []).map((row: any) => [row.teacher_id, row]));
  const adjustmentByStaff = new Map<string, { bonus: number; deduction: number }>();
  for (const adjustment of adjustmentRes.data ?? []) {
    const current = adjustmentByStaff.get(adjustment.teacher_id) ?? { bonus: 0, deduction: 0 };
    if (adjustment.type === "bonus") {
      current.bonus += Number(adjustment.amount ?? 0);
    } else {
      current.deduction += Number(adjustment.amount ?? 0);
    }
    adjustmentByStaff.set(adjustment.teacher_id, current);
  }
  const yearlyPaidByStaff = new Map<string, number>();
  for (const row of yearPaidRes.data ?? []) {
    yearlyPaidByStaff.set(row.teacher_id, (yearlyPaidByStaff.get(row.teacher_id) ?? 0) + Number(row.net_salary ?? 0));
  }

  return (staffRes.data ?? []).map((staff: any) => {
    const payroll = payrollByStaff.get(staff.user_id);
    const adjustments = adjustmentByStaff.get(staff.user_id) ?? { bonus: 0, deduction: 0 };
    const baseSalary = Number(payroll?.base_salary ?? employmentByStaff.get(staff.user_id) ?? 0);
    const bonus = Number(payroll?.total_bonus ?? adjustments.bonus);
    const deduction = Number(payroll?.total_deductions ?? adjustments.deduction);
    const netSalary = Math.max(0, baseSalary + bonus - deduction);

    return {
      staffId: staff.user_id,
      name: formatDisplayName(staff.full_name) || "Unknown",
      email: staff.email ?? null,
      role: staff.role ?? "staff",
      jobTitle: staff.job_title ?? null,
      baseSalary,
      bonus,
      deduction,
      netSalary: Number(payroll?.net_salary ?? netSalary),
      status: payroll?.status === "paid" ? "paid" : "unpaid",
      paymentDate: payroll?.payment_date ?? null,
      remarks: payroll?.remarks ?? null,
      payrollId: payroll?.id ?? null,
      yearlyPaidTotal: yearlyPaidByStaff.get(staff.user_id) ?? 0
    };
  });
}

export async function saveStaffPay(
  user: AppUser,
  values: {
    staffId: string;
    month: string;
    baseSalary: number;
    bonus: number;
    deduction: number;
    remarks?: string | null;
  }
) {
  assertPayrollPortalAccess(user);
  if (!hasPermission(user.role, "payroll:manage", user.permissions)) throw new Error("Unauthorized");
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(values.month)) throw new Error("Month must use YYYY-MM");
  if (values.baseSalary <= 0) throw new Error("Base salary must be greater than zero");
  if (values.bonus < 0 || values.deduction < 0) throw new Error("Bonus and deduction cannot be negative");

  const supabase = await createClient();
  const effectiveDate = `${values.month}-01`;
  const netSalary = Math.max(0, values.baseSalary + values.bonus - values.deduction);

  const [{ data: currentPayroll, error: payrollError }, { data: employment, error: employmentError }] = await Promise.all([
    supabase
      .from("payroll")
      .select("id, status")
      .eq("school_id", user.schoolId)
      .eq("teacher_id", values.staffId)
      .eq("month", values.month)
      .maybeSingle(),
    supabase
      .from("teacher_employment_details")
      .select("*")
      .eq("school_id", user.schoolId)
      .eq("teacher_id", values.staffId)
      .maybeSingle()
  ]);

  if (payrollError) throw new Error(payrollError.message);
  if (employmentError) throw new Error(employmentError.message);
  if (currentPayroll?.status === "paid") throw new Error("Mark this salary as unpaid before editing it.");

  const previousSalary = Number(employment?.monthly_salary ?? 0);
  const salaryChanged = previousSalary !== values.baseSalary;

  const { error: employmentUpsertError } = await supabase.from("teacher_employment_details").upsert({
    teacher_id: values.staffId,
    school_id: user.schoolId,
    designation: employment?.designation ?? null,
    department: employment?.department ?? null,
    joining_date: employment?.joining_date ?? effectiveDate,
    monthly_salary: values.baseSalary,
    payment_method: employment?.payment_method ?? "cash",
    salary_start_date: salaryChanged ? effectiveDate : employment?.salary_start_date ?? effectiveDate,
    employment_status: employment?.employment_status ?? "active"
  });
  if (employmentUpsertError) throw new Error(employmentUpsertError.message);

  if (salaryChanged) {
    await recordSalaryChange(
      user,
      values.staffId,
      previousSalary,
      values.baseSalary,
      previousSalary === 0 ? "initial" : values.baseSalary > previousSalary ? "increase" : "decrease",
      effectiveDate,
      values.remarks ?? undefined
    );
  }

  const { error: payrollUpsertError } = await supabase.from("payroll").upsert({
    school_id: user.schoolId,
    teacher_id: values.staffId,
    month: values.month,
    base_salary: values.baseSalary,
    total_bonus: values.bonus,
    total_deductions: values.deduction,
    net_salary: netSalary,
    status: "generated" satisfies PayrollStatus,
    payment_date: null,
    approved_by: user.id,
    remarks: values.remarks || null
  }, { onConflict: "school_id,teacher_id,month" });

  if (payrollUpsertError) throw new Error(payrollUpsertError.message);
}

export async function setStaffPayStatus(user: AppUser, staffId: string, month: string, status: "paid" | "unpaid") {
  assertPayrollPortalAccess(user);
  if (!hasPermission(user.role, "payroll:manage", user.permissions)) throw new Error("Unauthorized");
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Month must use YYYY-MM");

  const supabase = await createClient();
  const { data: currentPayroll, error: payrollError } = await supabase
    .from("payroll")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", staffId)
    .eq("month", month)
    .maybeSingle();
  if (payrollError) throw new Error(payrollError.message);

  if (status === "unpaid") {
    if (!currentPayroll) return;
    const { error } = await supabase
      .from("payroll")
      .update({ status: "generated", payment_date: null, approved_by: user.id })
      .eq("id", currentPayroll.id)
      .eq("school_id", user.schoolId);
    if (error) throw new Error(error.message);
    return;
  }

  if (currentPayroll) {
    const { error } = await supabase
      .from("payroll")
      .update({ status: "paid", payment_date: new Date().toISOString().split("T")[0], approved_by: user.id })
      .eq("id", currentPayroll.id)
      .eq("school_id", user.schoolId);
    if (error) throw new Error(error.message);
    return;
  }

  const rows = await getStaffPayRows(user, month);
  const row = rows.find((item) => item.staffId === staffId);
  if (!row || row.baseSalary <= 0) throw new Error("Set this employee's base salary before marking paid.");
  const { error } = await supabase.from("payroll").insert({
    school_id: user.schoolId,
    teacher_id: staffId,
    month,
    base_salary: row.baseSalary,
    total_bonus: row.bonus,
    total_deductions: row.deduction,
    net_salary: row.netSalary,
    status: "paid",
    payment_date: new Date().toISOString().split("T")[0],
    approved_by: user.id,
    remarks: row.remarks
  });
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
