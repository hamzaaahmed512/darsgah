"use server";

"use server";

import { requireUser } from "@/lib/auth/session";
import {
  generateMonthlyPayroll,
  createSalaryAdjustment,
  deleteSalaryAdjustment,
  markPayrollPaid,
  upsertTeacherEmploymentDetails
} from "@/lib/services/payroll";
import { revalidatePath } from "next/cache";
import type { AdjustmentType } from "@/types/database";

export async function generatePayrollAction(month: string, teacherId?: string) {
  try {
    const user = await requireUser("payroll:manage");
    const result = await generateMonthlyPayroll(user, month, teacherId);
    revalidatePath("/payroll");
    return { ok: true, created: Number(result?.created_count ?? 0), skipped: Number(result?.skipped_count ?? 0), skippedNoSalary: Number(result?.skipped_no_salary_count ?? 0) };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function markPayrollPaidAction(payrollId: string) {
  try {
    const user = await requireUser("payroll:manage");
    await markPayrollPaid(user, payrollId);
    revalidatePath("/payroll");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createAdjustmentAction(data: {
  teacher_id: string;
  amount: number;
  type: AdjustmentType;
  reason: string;
  effective_date: string;
}) {
  try {
    const user = await requireUser("payroll:manage");
    await createSalaryAdjustment(user, data);
    revalidatePath("/payroll");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteAdjustmentAction(adjustmentId: string) {
  try {
    const user = await requireUser("payroll:manage");
    await deleteSalaryAdjustment(user, adjustmentId);
    revalidatePath("/payroll");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function saveEmploymentDetailsAction(
  teacherId: string,
  data: {
    designation?: string;
    department?: string;
    joining_date?: string;
    monthly_salary?: number;
    payment_method?: "cash" | "bank_transfer" | "cheque";
    salary_start_date?: string;
    employment_status?: "active" | "inactive" | "archived";
  }
) {
  try {
    const user = await requireUser("payroll:manage");
    await upsertTeacherEmploymentDetails(user, teacherId, data);
    revalidatePath("/payroll");
    revalidatePath("/teachers");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
