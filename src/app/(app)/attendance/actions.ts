"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { reopenAttendance, submitAttendance, submitTeacherAttendance } from "@/lib/services/attendance";
import type { AttendanceSubmission, TeacherAttendanceSubmission } from "@/lib/validation/attendance";

export async function submitAttendanceAction(values: AttendanceSubmission) {
  const user = await requireUser("attendance:view");
  await submitAttendance(user, values);
  revalidatePath("/attendance");
}

export async function submitTeacherAttendanceAction(values: TeacherAttendanceSubmission) {
  const user = await requireUser("attendance:view");
  await submitTeacherAttendance(user, values);
  revalidatePath("/attendance");
}

export async function reopenAttendanceAction(classId: string, attendanceDate: string) {
  const user = await requireUser("attendance:view");
  await reopenAttendance(user, classId, attendanceDate);
  revalidatePath("/attendance");
}
