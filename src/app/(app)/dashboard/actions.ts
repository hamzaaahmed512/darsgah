"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { formatDisplayName } from "@/lib/student-name";

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

  const { data: existingReminder, error: reminderError } = await supabase
    .from("activity_logs")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("action", "attendance_reminder_sent")
    .eq("entity_type", "class")
    .eq("entity_id", classId)
    .contains("metadata", { attendance_date: today })
    .limit(1)
    .maybeSingle();

  if (reminderError) return { error: reminderError.message };
  if (existingReminder) return { error: "A reminder has already been sent for this class today." };

  const headTeacher = Array.isArray(targetClass.head_teacher) ? targetClass.head_teacher[0] : targetClass.head_teacher;

  const { error: announcementError } = await supabase.from("announcements").insert({
    school_id: user.schoolId,
    title: "Attendance reminder",
    description: `Please mark attendance for ${targetClass.name} today.`,
    priority: "high",
    type: "urgent",
    audience_type: "roles",
    audience_value: `user:${targetClass.head_teacher_id}`,
    publish_date: today,
    expiry_date: today,
    created_by: user.id
  });

  if (announcementError) return { error: announcementError.message };

  await logActivity(user, "attendance_reminder_sent", "class", classId, {
    class_name: targetClass.name,
    head_teacher_id: targetClass.head_teacher_id,
    head_teacher_name: formatDisplayName(headTeacher?.full_name) || null,
    attendance_date: today
  });

  revalidatePath("/dashboard/principal");
  revalidatePath("/attendance");
  return {
    ok: true,
    teacherName: formatDisplayName(headTeacher?.full_name) || "Head teacher"
  };
}
