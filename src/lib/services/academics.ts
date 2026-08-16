import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { logActivity } from "@/lib/services/activity";


export async function getAcademicOptions(user: AppUser) {
  const supabase = await createClient();
  const [years, grades, sections, subjects, classes] = await Promise.all([
    supabase.from("academic_years").select("*").eq("school_id", user.schoolId).order("starts_on", { ascending: false }),
    supabase.from("grades").select("*").eq("school_id", user.schoolId).order("sort_order"),
    supabase.from("sections").select("*").eq("school_id", user.schoolId).order("name"),
    supabase.from("subjects").select("*").eq("school_id", user.schoolId).order("name"),
    supabase
      .from("classes")
      .select("id,name,room,grade_id,section_id,academic_year_id,head_teacher_id,grades(name),sections(name),academic_years(name),head_teacher:profiles!classes_head_teacher_id_fkey(full_name,email)")
      .eq("school_id", user.schoolId)
      .order("name")
  ]);

  return {
    years: years.data ?? [],
    grades: grades.data ?? [],
    sections: sections.data ?? [],
    subjects: subjects.data ?? [],
    classes: (classes.data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      room: row.room,
      grade_name: row.grades?.name ?? "Unassigned",
      section_name: row.sections?.name ?? null,
      academic_year_name: row.academic_years?.name ?? "Academic year",
      grade_id: row.grade_id,
      section_id: row.section_id,
      academic_year_id: row.academic_year_id,
      head_teacher_id: row.head_teacher_id,
      head_teacher_name: row.head_teacher?.full_name ?? null,
      head_teacher_email: row.head_teacher?.email ?? null
    }))
  };
}

export async function getTeacherSubjectAssignments(user: AppUser) {
  const supabase = await createClient();
  let query = supabase
    .from("teacher_assignments")
    .select("classes(id,name,room,grades(name),sections(name),academic_years(name)), subjects(name)")
    .eq("school_id", user.schoolId);

  if (user.role === "teacher") {
    query = query.eq("teacher_id", user.id);
  }

  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []).map((row: any) => ({
    id: row.classes?.id,
    name: row.classes?.name,
    room: row.classes?.room,
    grade_name: row.classes?.grades?.name,
    section_name: row.classes?.sections?.name,
    academic_year_name: row.classes?.academic_years?.name,
    subject_name: row.subjects?.name
  }));
}

export async function getTeacherHeadClasses(user: AppUser) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const query = supabase
    .from("classes")
    .select("id,name,room,grades(name),sections(name),academic_years(name),attendance_sessions!left(id,attendance_date)")
    .eq("school_id", user.schoolId)
    .eq("head_teacher_id", user.id)
    .eq("attendance_sessions.attendance_date", today)
    .order("name");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    room: row.room,
    grade_name: row.grades?.name,
    section_name: row.sections?.name,
    academic_year_name: row.academic_years?.name,
    attendance_marked_today: Boolean(row.attendance_sessions?.length)
  }));
}

async function assertHeadTeacher(user: AppUser, teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_members")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("user_id", teacherId)
    .eq("role", "teacher")
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Head teacher must be an active teacher in this school.");
}

export async function createClass(user: AppUser, data: { name: string; grade_id: string; section_id?: string | null; academic_year_id: string; room?: string | null; head_teacher_id: string }) {
  await assertHeadTeacher(user, data.head_teacher_id);
  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    school_id: user.schoolId,
    name: data.name,
    grade_id: data.grade_id,
    section_id: data.section_id || null,
    academic_year_id: data.academic_year_id,
    room: data.room || null,
    head_teacher_id: data.head_teacher_id
  });

  if (error) throw new Error(error.message);
}

export async function updateClass(user: AppUser, classId: string, data: { name: string; grade_id: string; section_id?: string | null; academic_year_id: string; room?: string | null; head_teacher_id: string }) {
  await assertHeadTeacher(user, data.head_teacher_id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      name: data.name,
      grade_id: data.grade_id,
      section_id: data.section_id || null,
      academic_year_id: data.academic_year_id,
      room: data.room || null,
      head_teacher_id: data.head_teacher_id
    })
    .eq("school_id", user.schoolId)
    .eq("id", classId);

  if (error) throw new Error(error.message);
}

export async function deleteClass(user: AppUser, classId: string) {
  const supabase = await createClient();

  // Check for active enrollments before deleting
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("school_id", user.schoolId)
    .eq("class_id", classId)
    .eq("status", "active");

  if (count && count > 0) {
    throw new Error(`Cannot delete class with ${count} active enrollment(s). Withdraw or transfer students first.`);
  }

  // Delete teacher assignments for this class
  await supabase
    .from("teacher_assignments")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("class_id", classId);

  // Delete the class itself
  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("id", classId);

  if (error) throw new Error(error.message);
  await logActivity(user, "class_deleted", "class", classId);
}

export async function getClassTeachersAndAttendance(user: AppUser) {
  const supabase = await createClient();
  const attendanceSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [assignmentsResult, recordsResult, enrollmentsResult] = await Promise.all([
    supabase
      .from("teacher_assignments")
      .select("id,class_id,teacher_id,profiles!teacher_assignments_teacher_id_fkey(full_name),subjects(name)")
      .eq("school_id", user.schoolId),
    supabase
      .from("attendance_records")
      .select("class_id,status")
      .eq("school_id", user.schoolId)
      .gte("attendance_date", attendanceSince),
    supabase
      .from("enrollments")
      .select("class_id")
      .eq("school_id", user.schoolId)
      .eq("status", "active")
  ]);

  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
  if (recordsResult.error) throw new Error(recordsResult.error.message);
  if (enrollmentsResult.error) throw new Error(enrollmentsResult.error.message);

  const assignments = assignmentsResult.data ?? [];
  const records = recordsResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];

  // Group assignments by class_id
  const teachersByClass: Record<string, Array<{ id: string; teacher_id: string; teacher_name: string; subject_name: string | null }>> = {};
  for (const row of assignments ?? []) {
    const a = row as any;
    const classId = a.class_id;
    if (!teachersByClass[classId]) teachersByClass[classId] = [];
    teachersByClass[classId].push({
      id: a.id,
      teacher_id: a.teacher_id,
      teacher_name: a.profiles?.full_name ?? "Unknown",
      subject_name: a.subjects?.name ?? null
    });
  }

  // Attendance summaries intentionally use the recent 30-day window so this
  // management screen does not read the school's full attendance history.
  const attendanceByClass: Record<string, { total_sessions: number; present: number; absent: number; late: number; excused: number }> = {};
  for (const r of records) {
    const rec = r as any;
    const classId = rec.class_id;
    if (!attendanceByClass[classId]) attendanceByClass[classId] = { total_sessions: 0, present: 0, absent: 0, late: 0, excused: 0 };
    if (rec.status === "present") attendanceByClass[classId].present++;
    else if (rec.status === "absent") attendanceByClass[classId].absent++;
    else if (rec.status === "late") attendanceByClass[classId].late++;
    else if (rec.status === "excused") attendanceByClass[classId].excused++;
  }

  // Group student counts by class_id
  const studentsByClass: Record<string, number> = {};
  for (const e of enrollments) {
    const classId = (e as any).class_id;
    studentsByClass[classId] = (studentsByClass[classId] || 0) + 1;
  }

  return { teachersByClass, attendanceByClass, studentsByClass };
}
