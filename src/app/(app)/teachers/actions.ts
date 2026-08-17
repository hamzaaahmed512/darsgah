"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createStaffAccount, updateStaffStatus, assignTeacherToClass, setStaffSalary } from "@/lib/services/teachers";
import type { StaffFormValues } from "@/lib/validation/staff";

export async function createStaffAction(values: StaffFormValues) {
  const user = await requireUser("teachers:manage");
  await createStaffAccount(user, values);
  revalidatePath("/teachers");
  revalidatePath("/staff");
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
