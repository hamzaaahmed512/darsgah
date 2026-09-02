"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createStaffAccount, updateStaffStatus, assignTeacherToClass, setStaffSalary, StaffEmailAlreadyAssignedError } from "@/lib/services/teachers";
import { createOtherStaffRecord, setOtherStaffSalary } from "@/lib/services/staff";
import type { OtherStaffCategory } from "@/lib/constants/staff";
import { otherStaffRecordSchema, type StaffFormValues } from "@/lib/validation/staff";

type StaffActionResult =
  | { success: true; error: null; field?: never }
  | { success: false; error: string; field?: keyof StaffFormValues };

export async function createStaffAction(values: StaffFormValues): Promise<StaffActionResult> {
  const user = await requireUser("teachers:manage");
  try {
    await createStaffAccount(user, values);
    revalidatePath("/teachers");
    revalidatePath("/staff");
    revalidatePath("/admin");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof StaffEmailAlreadyAssignedError) {
      return { success: false, error: error.message, field: error.field };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create staff member. Please try again."
    };
  }
}

export async function assignTeacherAction(teacherId: string, classId: string, subjectId?: string) {
  const user = await requireUser("teachers:manage");
  await assignTeacherToClass(user, teacherId, classId, subjectId);
  revalidatePath("/teachers");
  revalidatePath("/academics");
}

export async function updateStatusAction(memberId: string, status: "active" | "disabled") {
  const user = await requireUser("teachers:manage");
  await updateStaffStatus(user, memberId, status);
  revalidatePath("/teachers");
  revalidatePath("/staff");
}

export async function setStaffSalaryAction(staffId: string, salary: number) {
  const user = await requireUser("teachers:manage");
  await setStaffSalary(user, staffId, salary);
  revalidatePath("/staff");
  revalidatePath("/finance/payroll");
}

export async function createOtherStaffAction(values: {
  fullName: string;
  category: OtherStaffCategory;
  department?: string;
  jobTitle?: string;
  phone?: string;
  monthlySalary?: number | null;
}) {
  const user = await requireUser("teachers:manage");
  const parsed = otherStaffRecordSchema.parse(values);
  await createOtherStaffRecord(user, {
    ...parsed,
    department: parsed.department ?? undefined,
    jobTitle: parsed.jobTitle ?? undefined,
    phone: parsed.phone ?? undefined
  });
  revalidatePath("/staff");
  revalidatePath("/finance/payroll");
}

export async function setOtherStaffSalaryAction(staffId: string, salary: number) {
  const user = await requireUser("teachers:manage");
  await setOtherStaffSalary(user, staffId, salary);
  revalidatePath("/staff");
  revalidatePath("/finance/payroll");
}
