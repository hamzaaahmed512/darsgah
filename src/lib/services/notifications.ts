import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { getPendingAttendanceClasses } from "@/lib/services/dashboard";
import { resolveNotificationPreferences } from "@/lib/notification-preferences";

export type WorkflowNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: "low" | "medium" | "high" | "critical";
  category: "attendance" | "leave" | "queries";
};

export type NotificationSummary = {
  notifications: WorkflowNotification[];
  sidebarBadges: {
    attendance: number;
    leave: number;
    queries: number;
  };
};

function getSchoolNow(timeZone: string | null | undefined) {
  const zone = timeZone || "Asia/Karachi";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    minutes: Number(value.hour) * 60 + Number(value.minute)
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

async function getSchoolNotificationSettings(user: AppUser) {
  const supabase = await createClient();
  const [schoolResult, settingsResult] = await Promise.all([
    supabase.from("schools").select("timezone").eq("id", user.schoolId).maybeSingle(),
    supabase.from("school_settings").select("settings").eq("school_id", user.schoolId).maybeSingle()
  ]);

  if (schoolResult.error || settingsResult.error) {
    return {
      timeZone: "Asia/Karachi",
      preferences: resolveNotificationPreferences(null)
    };
  }

  return {
    timeZone: schoolResult.data?.timezone ?? "Asia/Karachi",
    preferences: resolveNotificationPreferences(settingsResult.data?.settings)
  };
}

async function getPendingLeaveCount(user: AppUser) {
  if (!hasPermission(user.role, "leave:manage", user.permissions)) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("staff_leaves")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("status", "pending");

  if (error?.code === "PGRST205" || error?.message?.includes("public.staff_leaves")) return 0;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getOpenQueryCount(user: AppUser) {
  const supabase = await createClient();
  if (user.role !== "administrator" && user.role !== "principal") {
    const { data: queries, error: queryError } = await supabase
      .from("internal_support_queries")
      .select("id,created_at,updated_at,submitter_viewed_at")
      .eq("school_id", user.schoolId)
      .eq("submitted_by", user.id);
    if (queryError) throw new Error(queryError.message);
    if (!queries?.length) return 0;

    const { data: remarks, error: remarksError } = await createAdminClient()
      .from("internal_support_query_remarks")
      .select("query_id,created_at")
      .eq("school_id", user.schoolId)
      .in("query_id", queries.map((query) => query.id));
    if (remarksError) throw new Error(remarksError.message);
    const latestRemarkByQuery = new Map<string, string>();
    for (const remark of remarks ?? []) {
      const latest = latestRemarkByQuery.get(remark.query_id);
      if (!latest || remark.created_at > latest) latestRemarkByQuery.set(remark.query_id, remark.created_at);
    }
    return queries.filter((query) => {
      const viewedAt = query.submitter_viewed_at ?? query.created_at;
      const latestRemark = latestRemarkByQuery.get(query.id);
      return query.updated_at > viewedAt || Boolean(latestRemark && latestRemark > viewedAt);
    }).length;
  }
  const { count, error } = await supabase.from("internal_support_queries").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("status", "open");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getTeacherPendingHeadClasses(user: AppUser, today: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id,name,grades(name),sections(name),attendance_sessions!left(id,attendance_date)")
    .eq("school_id", user.schoolId)
    .eq("head_teacher_id", user.id)
    .eq("attendance_sessions.attendance_date", today)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row: any) => !row.attendance_sessions?.length)
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      grade_name: row.grades?.name ?? null,
      section_name: row.sections?.name ?? null
    }));
}

export async function getNotificationSummary(user: AppUser): Promise<NotificationSummary> {
  const { timeZone, preferences } = await getSchoolNotificationSettings(user);
  const now = getSchoolNow(timeZone);
  const deadline = timeToMinutes(preferences.attendanceDeadlineTime);
  const reminderStart = Math.max(0, deadline - 60);
  const notifications: WorkflowNotification[] = [];
  let attendanceBadge = 0;
  let leaveBadge = 0;
  let queriesBadge = 0;

  if (preferences.attendanceDeadlineEnabled) {
    const canReviewAttendance = user.role === "administrator" || user.role === "principal";
    const isTeacher = user.role === "teacher" || user.role === "head_teacher" || user.role === "principal";

    if (canReviewAttendance && now.minutes >= deadline) {
      const pendingClasses = await getPendingAttendanceClasses(user).catch(() => []);
      attendanceBadge = pendingClasses.length;
      if (pendingClasses.length) {
        notifications.push({
          id: `attendance-overdue-${now.date}`,
          title: `${pendingClasses.length} class${pendingClasses.length === 1 ? "" : "es"} missing attendance`,
          description: `Attendance is still pending after ${preferences.attendanceDeadlineTime}.`,
          href: "/attendance",
          priority: "high",
          category: "attendance"
        });
      }
    } else if (isTeacher && now.minutes >= reminderStart && now.minutes < deadline) {
      const pendingHeadClasses = await getTeacherPendingHeadClasses(user, now.date).catch(() => []);
      attendanceBadge = pendingHeadClasses.length;
      if (pendingHeadClasses.length) {
        notifications.push({
          id: `attendance-reminder-${now.date}`,
          title: "Attendance reminder",
          description: `Please mark attendance before ${preferences.attendanceDeadlineTime}.`,
          href: "/attendance?mode=class",
          priority: "medium",
          category: "attendance"
        });
      }
    }
  }

  if (preferences.leaveRequestNotificationsEnabled && hasPermission(user.role, "leave:manage", user.permissions)) {
    leaveBadge = await getPendingLeaveCount(user).catch(() => 0);
    if (leaveBadge) {
      notifications.push({
        id: `pending-leaves-${leaveBadge}`,
        title: `${leaveBadge} leave request${leaveBadge === 1 ? "" : "s"} pending`,
        description: "Review new staff leave requests.",
        href: "/leave",
        priority: "medium",
        category: "leave"
      });
    }
  }

  queriesBadge = await getOpenQueryCount(user).catch(() => 0);

  return {
    notifications,
    sidebarBadges: {
      attendance: attendanceBadge,
      leave: leaveBadge,
      queries: queriesBadge
    }
  };
}
