import { subDays, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, PendingAttendanceClass } from "@/types/database";
import { getTeacherHeadClasses } from "@/lib/services/academics";
import { sortClassesNaturally } from "@/lib/class-sort";

type ClassDistributionRow = { class_name: string; grade_name: string | null; student_count: number };

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

export async function getPendingAttendanceClasses(user: AppUser): Promise<PendingAttendanceClass[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      room,
      head_teacher_id,
      grades(name),
      sections(name),
      academic_years!inner(is_active),
      head_teacher:profiles!classes_head_teacher_id_fkey(full_name, email, phone),
      attendance_sessions!left(id, attendance_date)
    `)
    .eq("school_id", user.schoolId)
    .eq("academic_years.is_active", true)
    .eq("attendance_sessions.attendance_date", today)
    .order("name");

  if (error) throw new Error(error.message);

  return sortClassesNaturally((data ?? [])
    .filter((row: any) => !row.attendance_sessions?.length)
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      room: row.room,
      grade_name: row.grades?.name ?? null,
      section_name: row.sections?.name ?? null,
      head_teacher_id: row.head_teacher_id,
      head_teacher_name: row.head_teacher?.full_name ?? null,
      head_teacher_email: row.head_teacher?.email ?? null,
      head_teacher_phone: row.head_teacher?.phone ?? null
    })));
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
      classDistribution: sortClassesNaturally((data.classDistribution ?? []) as ClassDistributionRow[])
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
    classDistribution: sortClassesNaturally((classDistribution.data ?? []) as ClassDistributionRow[])
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
