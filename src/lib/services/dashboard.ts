import { subDays, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, PendingAttendanceClass } from "@/types/database";
import { getTeacherHeadClasses } from "@/lib/services/academics";
import { sortClassesNaturally } from "@/lib/class-sort";
import { hasPermission } from "@/lib/permissions";

type ClassDistributionRow = { class_name: string; grade_name: string | null; student_count: number };

export type DailyOperationItem = {
  id: string;
  label: string;
  value: number;
  description: string;
  href: string;
  tone: "blue" | "green" | "yellow" | "red" | "gray";
  actionLabel: string;
};

function isMissingTable(error: { code?: string; message?: string } | null, tableName: string) {
  return error?.code === "PGRST205" || error?.code === "42P01" || Boolean(error?.message?.includes(tableName));
}

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

async function countTeacherAttendanceConcerns(user: AppUser, today: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("teacher_attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("attendance_date", today)
    .in("status", ["absent", "late"]);

  if (isMissingTable(error, "teacher_attendance_records")) return 0;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countPendingLeaves(user: AppUser) {
  if (!hasPermission(user.role, "leave:manage", user.permissions)) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("staff_leaves")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("status", "pending");

  if (isMissingTable(error, "staff_leaves")) return 0;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countPendingStudentApprovals(user: AppUser) {
  if (!hasPermission(user.role, "approvals:review", user.permissions)) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countPendingResultApprovals(user: AppUser) {
  if (!hasPermission(user.role, "marks:approve", user.permissions)) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("exams")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("approval_status", "pending_approval");

  if (error?.code === "42703" || error?.message?.includes("approval_status")) return 0;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countOverdueFeeAccounts(user: AppUser) {
  if (!hasPermission(user.role, "finance:view", user.permissions)) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("student_fee_directory")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("payment_status", "overdue");

  if (isMissingTable(error, "student_fee_directory")) return 0;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getDailyOperationsCenter(user: AppUser): Promise<DailyOperationItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [
    pendingAttendance,
    teacherAttendanceConcerns,
    pendingLeaves,
    pendingStudentApprovals,
    pendingResultApprovals,
    overdueFees
  ] = await Promise.all([
    hasPermission(user.role, "attendance:view", user.permissions) ? getPendingAttendanceClasses(user).catch(() => []) : Promise.resolve([]),
    countTeacherAttendanceConcerns(user, today).catch(() => 0),
    countPendingLeaves(user).catch(() => 0),
    countPendingStudentApprovals(user).catch(() => 0),
    countPendingResultApprovals(user).catch(() => 0),
    countOverdueFeeAccounts(user).catch(() => 0)
  ]);

  const items: DailyOperationItem[] = [
    {
      id: "attendance",
      label: "Class attendance",
      value: pendingAttendance.length,
      description: pendingAttendance.length ? "Classes still need attendance today." : "All class attendance is clear for today.",
      href: "/attendance",
      tone: pendingAttendance.length ? "red" : "green",
      actionLabel: pendingAttendance.length ? "Open attendance" : "View register"
    },
    {
      id: "teacher-attendance",
      label: "Teacher attendance",
      value: teacherAttendanceConcerns,
      description: teacherAttendanceConcerns ? "Teachers are absent or late today." : "No teacher attendance concerns recorded today.",
      href: "/attendance?view=teachers",
      tone: teacherAttendanceConcerns ? "yellow" : "green",
      actionLabel: "Teacher attendance"
    },
    {
      id: "leaves",
      label: "Leave requests",
      value: pendingLeaves,
      description: pendingLeaves ? "Staff leave requests are waiting for review." : "No leave requests waiting.",
      href: "/leave",
      tone: pendingLeaves ? "yellow" : "green",
      actionLabel: "Review leaves"
    },
    {
      id: "student-approvals",
      label: "Student approvals",
      value: pendingStudentApprovals,
      description: pendingStudentApprovals ? "Admission or cancellation requests need a decision." : "No student requests waiting.",
      href: "/students?status=pending_approval",
      tone: pendingStudentApprovals ? "blue" : "green",
      actionLabel: "Review students"
    },
    {
      id: "result-approvals",
      label: "Result approvals",
      value: pendingResultApprovals,
      description: pendingResultApprovals ? "Exam result sets are waiting for approval." : "No result approvals waiting.",
      href: "/results?status=pending_approval",
      tone: pendingResultApprovals ? "yellow" : "green",
      actionLabel: "Review results"
    },
    {
      id: "fees",
      label: "Overdue fees",
      value: overdueFees,
      description: overdueFees ? "Student fee accounts are overdue." : "No overdue fee accounts found.",
      href: "/finance/fees?status=overdue",
      tone: overdueFees ? "red" : "green",
      actionLabel: "Open fees"
    }
  ];

  return items.filter((item) => {
    if (item.id === "result-approvals") return hasPermission(user.role, "marks:approve", user.permissions);
    if (item.id === "fees") return hasPermission(user.role, "finance:view", user.permissions);
    if (item.id === "leaves") return hasPermission(user.role, "leave:manage", user.permissions);
    if (item.id === "student-approvals") return hasPermission(user.role, "approvals:review", user.permissions);
    return true;
  });
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
