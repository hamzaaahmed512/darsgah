import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { attendanceSubmissionSchema, teacherAttendanceSubmissionSchema, type AttendanceSubmission, type TeacherAttendanceSubmission } from "@/lib/validation/attendance";
import { logActivity } from "@/lib/services/activity";
import { sortClassesNaturally } from "@/lib/class-sort";
import { formatDisplayName, formatFullName } from "@/lib/student-name";

function isMissingTeacherAttendanceTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01" || Boolean(error?.message?.includes("teacher_attendance_records"));
}

export async function getClassAttendanceSummary(user: AppUser, classId: string, startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_class_attendance_summary", {
    p_school_id: user.schoolId,
    p_class_id: classId,
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAttendanceContext(
  user: AppUser,
  classId?: string,
  date?: string,
  options: { scope?: "school" | "class" } = {}
) {
  const supabase = await createClient();
  const attendanceDate = date ?? new Date().toISOString().slice(0, 10);
  let teacherClassIds: string[] | null = null;
  const classScoped = options.scope === "class";

  if (user.role === "teacher" || user.role === "head_teacher" || (user.role === "principal" && classScoped)) {
    const headClasses = await supabase.from("classes").select("id").eq("school_id", user.schoolId).eq("head_teacher_id", user.id);
    if (headClasses.error) throw new Error(headClasses.error.message);
    teacherClassIds = (headClasses.data ?? []).map((row: any) => row.id);
  }

  let classQuery = supabase
    .from("classes")
    .select("id,name,room,head_teacher_id,grades(name),sections(name),academic_years(name)")
    .eq("school_id", user.schoolId)
    .order("name");

  if (teacherClassIds) {
    classQuery = teacherClassIds.length ? classQuery.in("id", teacherClassIds) : classQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: classRows, error: classError } = await classQuery;
  if (classError) throw new Error(classError.message);
  const classes = sortClassesNaturally(classRows ?? []);
  const selectedClassId = classId ?? classes[0]?.id;
  const [enrollments, records] = selectedClassId
    ? await Promise.all([
        supabase
          .from("enrollments")
          .select("id, student_id, students(id, first_name, last_name, admission_number)")
          .eq("school_id", user.schoolId)
          .eq("class_id", selectedClassId)
          .lte("starts_on", attendanceDate)
          .or(`ends_on.is.null,ends_on.gte.${attendanceDate}`)
          .order("created_at"),
        supabase
          .from("attendance_records")
          .select("student_id,status,note")
          .eq("school_id", user.schoolId)
          .eq("class_id", selectedClassId)
          .eq("attendance_date", attendanceDate)
      ])
    : [{ data: [] }, { data: [] }];

  if (enrollments.error) throw new Error(enrollments.error.message);
  if (records.error) throw new Error(records.error.message);

  const recordMap = new Map((records.data ?? []).map((record: any) => [record.student_id, record]));
  const roster = (enrollments.data ?? [])
    .map((row: any) => {
      const existing = recordMap.get(row.students?.id);
      return {
        enrollment_id: row.id,
        student_id: row.students?.id,
        student_name: formatFullName(row.students?.first_name, row.students?.last_name),
        admission_number: row.students?.admission_number,
        current_status: existing?.status ?? null,
        note: existing?.note ?? null
      };
    })
    .filter((row) => row.student_id)
    .sort((a, b) => a.student_name.localeCompare(b.student_name));

  const session = selectedClassId
    ? await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("school_id", user.schoolId)
        .eq("class_id", selectedClassId)
        .eq("attendance_date", attendanceDate)
        .maybeSingle()
    : { data: null };

  const sessionData = session.data as any;
  const now = Date.now();
  const submittedAt = sessionData?.submitted_at ? new Date(sessionData.submitted_at).getTime() : 0;
  const reopenedAt = sessionData?.reopened_at ? new Date(sessionData.reopened_at).getTime() : 0;
  const editWindowOpen = Boolean(sessionData?.status === "submitted" && reopenedAt && now - reopenedAt < 24 * 60 * 60 * 1_000);
  const teacherCanReopen = Boolean(
    sessionData?.status === "submitted" &&
    sessionData?.submitted_by === user.id &&
    !sessionData?.teacher_reopen_used_at &&
    submittedAt &&
    now - submittedAt < 24 * 60 * 60 * 1_000
  );
  const principalCanReopen = Boolean(
    user.role === "principal" &&
    sessionData &&
    !editWindowOpen &&
    (sessionData.teacher_reopen_used_at || !submittedAt || now - submittedAt >= 24 * 60 * 60 * 1_000)
  );

  return {
    classes: classes.map((row: any) => ({
      id: row.id,
      name: row.name,
      room: row.room,
      grade_name: row.grades?.name,
      section_name: row.sections?.name,
      academic_year_name: row.academic_years?.name,
      can_mark_attendance: (user.role === "teacher" || user.role === "head_teacher" || (user.role === "principal" && classScoped)) && row.head_teacher_id === user.id
    })),
    selectedClassId,
    attendanceDate,
    roster,
    session: sessionData,
    editWindowOpen,
    editDeadline: editWindowOpen ? new Date(reopenedAt + 24 * 60 * 60 * 1_000).toISOString() : null,
    canReopen: teacherCanReopen || principalCanReopen
  };
}

export async function reopenAttendance(user: AppUser, classId: string, attendanceDate: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_attendance_session", {
    p_school_id: user.schoolId,
    p_class_id: classId,
    p_attendance_date: attendanceDate
  });

  if (error) throw new Error(error.message);
  await logActivity(user, "attendance_reopened", "class", classId, { attendance_date: attendanceDate });
}

export async function principalHasTeachingClass(user: AppUser) {
  if (user.role !== "principal") return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("head_teacher_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

function canManageTeacherAttendance(user: AppUser) {
  return user.role === "administrator" || user.role === "principal";
}

export async function getTeacherAttendanceContext(user: AppUser, date?: string) {
  if (!canManageTeacherAttendance(user)) {
    throw new Error("Only administrators and principals can manage teacher attendance.");
  }

  const supabase = await createClient();
  const attendanceDate = date ?? new Date().toISOString().slice(0, 10);

  const [teachersResult, recordsResult] = await Promise.all([
    supabase
      .from("school_members")
      .select("user_id,role,department,job_title,profiles!school_members_user_id_fkey(full_name,email)")
      .eq("school_id", user.schoolId)
      .in("role", ["teacher", "head_teacher"])
      .eq("status", "active")
      .order("role"),
    supabase
      .from("teacher_attendance_records")
      .select("teacher_id,status,note")
      .eq("school_id", user.schoolId)
      .eq("attendance_date", attendanceDate)
  ]);

  if (teachersResult.error) throw new Error(teachersResult.error.message);
  if (isMissingTeacherAttendanceTable(recordsResult.error)) {
    const teachers = (teachersResult.data ?? [])
      .map((row: any) => ({
        teacher_id: row.user_id,
        teacher_name: formatDisplayName(row.profiles?.full_name) || "Teacher",
        teacher_email: row.profiles?.email ?? null,
        role: row.role,
        department: row.department,
        job_title: row.job_title,
        current_status: null,
        note: null
      }))
      .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name));

    return {
      attendanceDate,
      teachers,
      submitted: false,
      migrationRequired: true
    };
  }
  if (recordsResult.error) throw new Error(recordsResult.error.message);

  const recordMap = new Map((recordsResult.data ?? []).map((record: any) => [record.teacher_id, record]));
  const teachers = (teachersResult.data ?? [])
    .map((row: any) => {
      const existing = recordMap.get(row.user_id);
      return {
        teacher_id: row.user_id,
        teacher_name: formatDisplayName(row.profiles?.full_name) || "Teacher",
        teacher_email: row.profiles?.email ?? null,
        role: row.role,
        department: row.department,
        job_title: row.job_title,
        current_status: existing?.status ?? null,
        note: existing?.note ?? null
      };
    })
    .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name));

  return {
    attendanceDate,
    teachers,
    submitted: teachers.length > 0 && teachers.every((teacher) => teacher.current_status),
    migrationRequired: false
  };
}

export async function submitAttendance(user: AppUser, values: AttendanceSubmission) {
  const parsed = attendanceSubmissionSchema.parse(values);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_attendance_atomic", {
    p_school_id: user.schoolId,
    p_class_id: parsed.class_id,
    p_attendance_date: parsed.attendance_date,
    p_records: parsed.records
  });
  if (error?.code === "23505") throw new Error("Attendance already marked for today.");
  if (error) throw new Error(error.message);
}

export async function submitTeacherAttendance(user: AppUser, values: TeacherAttendanceSubmission) {
  if (!canManageTeacherAttendance(user)) {
    throw new Error("Only administrators and principals can mark teacher attendance.");
  }

  const parsed = teacherAttendanceSubmissionSchema.parse(values);
  const supabase = await createClient();
  const teacherIds = [...new Set(parsed.records.map((record) => record.teacher_id))];

  const { data: activeTeachers, error: teachersError } = await supabase
    .from("school_members")
    .select("user_id")
    .eq("school_id", user.schoolId)
    .in("role", ["teacher", "head_teacher"])
    .eq("status", "active")
    .in("user_id", teacherIds);

  if (teachersError) throw new Error(teachersError.message);

  const activeTeacherIds = new Set((activeTeachers ?? []).map((row: any) => row.user_id));
  const invalidTeacherId = teacherIds.find((teacherId) => !activeTeacherIds.has(teacherId));
  if (invalidTeacherId) throw new Error("Teacher not found or inactive.");

  const { error } = await supabase.from("teacher_attendance_records").upsert(
    parsed.records.map((record) => ({
      school_id: user.schoolId,
      teacher_id: record.teacher_id,
      attendance_date: parsed.attendance_date,
      status: record.status,
      note: record.note || null,
      recorded_by: user.id
    })),
    { onConflict: "school_id,teacher_id,attendance_date" }
  );

  if (isMissingTeacherAttendanceTable(error)) {
    throw new Error("Apply the latest database migration to enable teacher attendance.");
  }
  if (error) throw new Error(error.message);

  await logActivity(user, "teacher_attendance_submitted", "teacher_attendance", user.schoolId, {
    attendance_date: parsed.attendance_date,
    records: parsed.records.length
  });
}
