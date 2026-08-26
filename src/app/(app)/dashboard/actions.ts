"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";

export async function sendAttendanceReminderAction(classId: string) {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal") {
    return { error: "Only principals can send attendance reminders." };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: targetClass, error: classError } = await supabase
    .from("classes")
    .select("id, name, head_teacher_id, head_teacher:profiles!classes_head_teacher_id_fkey(full_name, email)")
    .eq("school_id", user.schoolId)
    .eq("id", classId)
    .maybeSingle();

  if (classError) return { error: classError.message };
  if (!targetClass) return { error: "Class not found." };
  if (!targetClass.head_teacher_id) return { error: "No head teacher assigned to this class." };

  const { data: existingSession, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("class_id", classId)
    .eq("attendance_date", today)
    .maybeSingle();

  if (sessionError) return { error: sessionError.message };
  if (existingSession) return { error: "Attendance has already been marked for this class today." };

  const headTeacher = targetClass.head_teacher?.[0] ?? null;

  await logActivity(user, "attendance_reminder_sent", "class", classId, {
    class_name: targetClass.name,
    head_teacher_id: targetClass.head_teacher_id,
    head_teacher_name: headTeacher?.full_name ?? null,
    attendance_date: today
  });

  revalidatePath("/dashboard/principal");
  revalidatePath("/attendance");
  return {
    ok: true,
    teacherName: headTeacher?.full_name ?? "Head teacher"
  };
}
