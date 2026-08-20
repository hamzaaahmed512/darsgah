import { subDays, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { getTeacherHeadClasses } from "@/lib/services/academics";

export async function getTeacherDashboardData(user: AppUser) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const headClasses = await getTeacherHeadClasses(user);
  const classIds = headClasses.map((item) => item.id);

  if (!classIds.length) {
    return { headClasses, totalStudents: 0, absentToday: 0, attendanceCompleted: 0 };
  }

  const [students, absences] = await Promise.all([
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("status", "active").in("class_id", classIds),
    supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("attendance_date", today).in("class_id", classIds).in("status", ["absent", "late"])
  ]);

  if (students.error) throw new Error(students.error.message);
  if (absences.error) throw new Error(absences.error.message);

  return {
    headClasses,
    totalStudents: students.count ?? 0,
    absentToday: absences.count ?? 0,
    attendanceCompleted: headClasses.filter((item) => item.attendance_marked_today).length
  };
}

export async function getDashboardData(user: AppUser) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const from = formatISO(subDays(new Date(), 30), { representation: "date" });

  const optimized = await supabase.rpc("get_school_dashboard", {
    p_school_id: user.schoolId,
    p_from: from,
    p_today: today
  });

  if (!optimized.error && optimized.data && typeof optimized.data === "object") {
    const data = optimized.data as any;
    return {
      totalStudents: Number(data.totalStudents ?? 0),
      totalTeachers: Number(data.totalTeachers ?? 0),
      totalStaff: Number(data.totalStaff ?? 0),
      absentToday: Number(data.absentToday ?? 0),
      attendanceRate: data.attendanceRate === null ? null : Number(data.attendanceRate),
      recentAdmissions: data.recentAdmissions ?? [],
      activity: data.activity ?? [],
      attendanceTrend: data.attendanceTrend ?? [],
      classDistribution: data.classDistribution ?? []
    };
  }

  // Rolling-deploy fallback for environments where the aggregation migration
  // has not reached PostgREST yet.
  const [
    students,
    teachers,
    staff,
    absences,
    recentAdmissions,
    activity,
    attendanceRecords,
    classDistribution
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("status", "active"),
    supabase.from("school_members").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("role", "teacher").eq("status", "active"),
    supabase.from("school_members").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("status", "active"),
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("school_id", user.schoolId)
      .eq("attendance_date", today)
      .in("status", ["absent", "late"]),
    supabase
      .from("students")
      .select("id, first_name, last_name, admission_number, admission_date")
      .eq("school_id", user.schoolId)
      .gte("admission_date", from)
      .order("admission_date", { ascending: false })
      .limit(5),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, created_at, metadata, profiles(full_name)")
      .eq("school_id", user.schoolId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("attendance_records")
      .select("attendance_date,status")
      .eq("school_id", user.schoolId)
      .gte("attendance_date", from),
    supabase
      .from("class_enrollment_counts")
      .select("class_name, grade_name, student_count")
      .eq("school_id", user.schoolId)
      .order("grade_name")
  ]);

  const attendanceRate = calculateAttendanceRate(attendanceRecords.data ?? []);

  return {
    totalStudents: students.count ?? 0,
    totalTeachers: teachers.count ?? 0,
    totalStaff: staff.count ?? 0,
    absentToday: absences.count ?? 0,
    attendanceRate,
    recentAdmissions: recentAdmissions.data ?? [],
    activity: activity.data ?? [],
    attendanceTrend: toTrend(attendanceRecords.data ?? []),
    classDistribution: classDistribution.data ?? []
  };
}

function calculateAttendanceRate(records: Array<{ status: string }>) {
  if (!records.length) return null;
  const present = records.filter((record) => record.status === "present" || record.status === "late").length;
  return (present / records.length) * 100;
}

function toTrend(records: Array<{ attendance_date: string; status: string }>) {
  const grouped = new Map<string, { total: number; present: number }>();
  records.forEach((record) => {
    const entry = grouped.get(record.attendance_date) ?? { total: 0, present: 0 };
    entry.total += 1;
    if (record.status === "present" || record.status === "late") entry.present += 1;
    grouped.set(record.attendance_date, entry);
  });
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      attendance: value.total ? Math.round((value.present / value.total) * 100) : 0
    }));
}
