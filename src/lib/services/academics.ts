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

  if (user.role === "teacher" || user.role === "head_teacher") {
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

async function assertHeadTeacher(user: AppUser, teacherId: string | null | undefined) {
  if (!teacherId) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_members")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("user_id", teacherId)
    .in("role", ["teacher", "head_teacher"])
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Head teacher must be an active teacher in this school.");
}

export async function createClass(user: AppUser, data: { name: string; grade_id: string; section_id?: string | null; academic_year_id: string; room?: string | null; head_teacher_id?: string | null }) {
  await assertHeadTeacher(user, data.head_teacher_id);
  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    school_id: user.schoolId,
    name: data.name,
    grade_id: data.grade_id,
    section_id: data.section_id || null,
    academic_year_id: data.academic_year_id,
    room: data.room || null,
    head_teacher_id: data.head_teacher_id || null
  });

  if (error) throw new Error(error.message);
}

export async function updateClass(user: AppUser, classId: string, data: { name: string; grade_id: string; section_id?: string | null; academic_year_id: string; room?: string | null; head_teacher_id?: string | null }) {
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
      head_teacher_id: data.head_teacher_id || null
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

  await supabase
    .from("class_subjects")
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

  // Group assignments by class_id, then merge rows for the same teacher.
  const teachersByClass: Record<string, Array<{
    id: string;
    teacher_id: string;
    teacher_name: string;
    subject_name: string | null;
    subject_names: string[];
    assignment_ids: string[];
  }>> = {};

  for (const row of assignments ?? []) {
    const a = row as any;
    const classId = a.class_id;
    if (!teachersByClass[classId]) teachersByClass[classId] = [];

    const subjectName = a.subjects?.name ?? null;
    const existing = teachersByClass[classId].find((item) => item.teacher_id === a.teacher_id);
    if (existing) {
      existing.assignment_ids.push(a.id);
      if (subjectName && !existing.subject_names.includes(subjectName)) {
        existing.subject_names.push(subjectName);
      }
      continue;
    }

    teachersByClass[classId].push({
      id: a.id,
      teacher_id: a.teacher_id,
      teacher_name: a.profiles?.full_name ?? "Unknown",
      subject_name: subjectName,
      subject_names: subjectName ? [subjectName] : [],
      assignment_ids: [a.id]
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

export async function getSubjectManagement(user: AppUser, classId?: string, subjectId?: string) {
  const supabase = await createClient();
  const [options, teachers] = await Promise.all([
    getAcademicOptions(user),
    supabase.from("school_members").select("user_id,profiles(full_name)").eq("school_id", user.schoolId).in("role", ["teacher", "head_teacher"]).eq("status", "active")
  ]);
  const selectedClassId = classId ?? options.classes[0]?.id;
  const classSubjects = selectedClassId
    ? await supabase
        .from("class_subjects")
        .select("subject_id,subjects(id,name,is_elective)")
        .eq("school_id", user.schoolId)
        .eq("class_id", selectedClassId)
    : { data: [], error: null };
  if (classSubjects.error) throw new Error(classSubjects.error.message);

  const classSubjectRows = (classSubjects.data ?? []).map((row: any) => ({
    id: row.subjects?.id ?? row.subject_id,
    name: row.subjects?.name ?? "Unknown",
    is_elective: Boolean(row.subjects?.is_elective)
  }));
  const availableSubjects = classSubjectRows.length ? classSubjectRows : options.subjects.map((subject: any) => ({
    id: subject.id,
    name: subject.name,
    is_elective: Boolean(subject.is_elective)
  }));

  const selectedSubjectId = subjectId ?? availableSubjects[0]?.id;
  const selectedSubject = availableSubjects.find((subject) => subject.id === selectedSubjectId) ?? null;
  const [assignments, roster, subjectEnrollments, electiveSubjects] = selectedClassId ? await Promise.all([
    supabase.from("teacher_assignments").select("id,subject_id,teacher_id,subjects(name),profiles!teacher_assignments_teacher_id_fkey(full_name)").eq("school_id", user.schoolId).eq("class_id", selectedClassId).not("subject_id", "is", null),
    supabase.from("enrollments").select("student_id,students(first_name,last_name,admission_number)").eq("school_id", user.schoolId).eq("class_id", selectedClassId).eq("status", "active").order("created_at"),
    selectedSubjectId ? supabase.from("student_subject_enrollments").select("student_id").eq("school_id", user.schoolId).eq("class_id", selectedClassId).eq("subject_id", selectedSubjectId) : Promise.resolve({ data: [], error: null }),
    supabase
      .from("class_subjects")
      .select("subject_id,subjects(id,name,is_elective)")
      .eq("school_id", user.schoolId)
      .eq("class_id", selectedClassId)
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (assignments.error) throw new Error(assignments.error.message);
  if (roster.error) throw new Error(roster.error.message);
  if (subjectEnrollments.error) throw new Error(subjectEnrollments.error.message);
  if (electiveSubjects.error) throw new Error(electiveSubjects.error.message);

  const electiveOptions = (electiveSubjects.data ?? [])
    .map((row: any) => ({
      id: row.subjects?.id ?? row.subject_id,
      name: row.subjects?.name ?? "Unknown",
      is_elective: Boolean(row.subjects?.is_elective)
    }))
    .filter((subject) => subject.is_elective);

  const enrolledStudentIds = new Set((subjectEnrollments.data ?? []).map((row: any) => row.student_id));
  const isElectiveSubject = Boolean(selectedSubject?.is_elective);
  const electiveSubjectIds = electiveOptions.map((subject) => subject.id);

  let studentElectiveByStudentId: Record<string, string | null> = {};
  if (selectedClassId && electiveSubjectIds.length) {
    const { data: electiveEnrollments, error: electiveEnrollmentError } = await supabase
      .from("student_subject_enrollments")
      .select("student_id,subject_id")
      .eq("school_id", user.schoolId)
      .eq("class_id", selectedClassId)
      .in("subject_id", electiveSubjectIds);
    if (electiveEnrollmentError) throw new Error(electiveEnrollmentError.message);
    studentElectiveByStudentId = Object.fromEntries(
      (electiveEnrollments ?? []).map((row: any) => [row.student_id, row.subject_id as string])
    );
  }

  const defaultEnrolledStudentIds = isElectiveSubject
    ? enrolledStudentIds
    : new Set((roster.data ?? []).map((row: any) => row.student_id));

  return {
    ...options,
    subjects: availableSubjects,
    teachers: (teachers.data ?? []).map((row: any) => ({ id: row.user_id, name: row.profiles?.full_name ?? "Unknown" })),
    selectedClassId,
    selectedSubjectId,
    selectedSubject,
    assignments: assignments.data ?? [],
    roster: (roster.data ?? []).map((row: any) => ({ id: row.student_id, name: `${row.students?.first_name ?? ""} ${row.students?.last_name ?? ""}`.trim(), admission_number: row.students?.admission_number })),
    enrolledStudentIds: defaultEnrolledStudentIds,
    savedEnrolledStudentIds: enrolledStudentIds,
    electiveOptions,
    isElectiveSubject,
    studentElectiveByStudentId
  };
}

export async function createSubject(user: AppUser, values: { name: string; code?: string; is_elective?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    school_id: user.schoolId,
    name: values.name.trim(),
    code: values.code?.trim() || null,
    is_elective: Boolean(values.is_elective)
  });
  if (error) throw new Error(error.message);
}

export async function getClassSubjects(user: AppUser, classId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_subjects")
    .select("id,subject_id,is_class_specific,subjects(id,name,is_elective)")
    .eq("school_id", user.schoolId)
    .eq("class_id", classId)
    .order("created_at");
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    subject_id: row.subject_id,
    is_class_specific: row.is_class_specific,
    name: row.subjects?.name ?? "Unknown",
    is_elective: Boolean(row.subjects?.is_elective)
  }));
}

export async function getClassSubjectsMap(user: AppUser) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_subjects")
    .select("id,class_id,subject_id,is_class_specific,subjects(id,name,is_elective)")
    .eq("school_id", user.schoolId)
    .order("created_at");
  if (error) {
    if (error.code === "42P01") return {};
    throw new Error(error.message);
  }

  const subjectsByClass: Record<string, Array<{
    id: string;
    subject_id: string;
    is_class_specific: boolean;
    name: string;
    is_elective: boolean;
  }>> = {};

  for (const row of data ?? []) {
    const classId = (row as any).class_id;
    if (!subjectsByClass[classId]) subjectsByClass[classId] = [];
    subjectsByClass[classId].push({
      id: row.id,
      subject_id: row.subject_id,
      is_class_specific: row.is_class_specific,
      name: (row as any).subjects?.name ?? "Unknown",
      is_elective: Boolean((row as any).subjects?.is_elective)
    });
  }

  return subjectsByClass;
}

export async function addClassSubject(
  user: AppUser,
  values: { classId: string; name: string; isClassSpecific?: boolean; isElective?: boolean }
) {
  const supabase = await createClient();
  const subjectName = values.name.trim();
  if (!subjectName) throw new Error("Subject name is required.");

  const { data: existingSubject, error: lookupError } = await supabase
    .from("subjects")
    .select("id")
    .eq("school_id", user.schoolId)
    .ilike("name", subjectName)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  let subjectId = existingSubject?.id;
  if (!subjectId) {
    const { data: createdSubject, error: createError } = await supabase
      .from("subjects")
      .insert({
        school_id: user.schoolId,
        name: subjectName,
        is_elective: Boolean(values.isElective)
      })
      .select("id")
      .single();
    if (createError) throw new Error(createError.message);
    subjectId = createdSubject.id;
  }

  const { error } = await supabase.from("class_subjects").upsert({
    school_id: user.schoolId,
    class_id: values.classId,
    subject_id: subjectId,
    is_class_specific: Boolean(values.isClassSpecific)
  }, { onConflict: "school_id,class_id,subject_id" });
  if (error) throw new Error(error.message);

  return subjectId;
}

export async function assignSubjectTeacher(user: AppUser, values: { classId: string; subjectId: string; teacherId: string }) {
  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase.from("teacher_assignments").select("id").eq("school_id", user.schoolId).eq("class_id", values.classId).eq("subject_id", values.subjectId).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  const { error } = existing
    ? await supabase.from("teacher_assignments").update({ teacher_id: values.teacherId }).eq("school_id", user.schoolId).eq("id", existing.id)
    : await supabase.from("teacher_assignments").insert({ school_id: user.schoolId, class_id: values.classId, subject_id: values.subjectId, teacher_id: values.teacherId });
  if (error) throw new Error(error.message);
}

async function assertSubjectLinkedToClass(user: AppUser, classId: string, subjectId: string) {
  const supabase = await createClient();
  const [{ data: classSubject, error: classSubjectError }, { data: assignment, error: assignmentError }] = await Promise.all([
    supabase.from("class_subjects").select("id").eq("school_id", user.schoolId).eq("class_id", classId).eq("subject_id", subjectId).maybeSingle(),
    supabase.from("teacher_assignments").select("id").eq("school_id", user.schoolId).eq("class_id", classId).eq("subject_id", subjectId).maybeSingle()
  ]);
  if (classSubjectError) throw new Error(classSubjectError.message);
  if (assignmentError) throw new Error(assignmentError.message);
  if (!classSubject && !assignment) {
    throw new Error("Subject must be assigned to this class before enrolling students.");
  }
}

export async function setStudentSubjectEnrollments(user: AppUser, values: { classId: string; subjectId: string; studentIds: string[] }) {
  const supabase = await createClient();
  await assertSubjectLinkedToClass(user, values.classId, values.subjectId);
  const { error: removeError } = await supabase.from("student_subject_enrollments").delete().eq("school_id", user.schoolId).eq("class_id", values.classId).eq("subject_id", values.subjectId);
  if (removeError) throw new Error(removeError.message);
  if (!values.studentIds.length) return;
  const { error } = await supabase.from("student_subject_enrollments").insert(values.studentIds.map((student_id) => ({ school_id: user.schoolId, class_id: values.classId, subject_id: values.subjectId, student_id, enrolled_by: user.id })));
  if (error) throw new Error(error.message);
}

export async function setStudentElectiveEnrollment(
  user: AppUser,
  values: { classId: string; studentId: string; subjectId: string | null; electiveGroupSubjectIds: string[] }
) {
  const supabase = await createClient();
  if (values.electiveGroupSubjectIds.length) {
    const { error: removeError } = await supabase
      .from("student_subject_enrollments")
      .delete()
      .eq("school_id", user.schoolId)
      .eq("class_id", values.classId)
      .eq("student_id", values.studentId)
      .in("subject_id", values.electiveGroupSubjectIds);
    if (removeError) throw new Error(removeError.message);
  }

  if (!values.subjectId) return;
  await assertSubjectLinkedToClass(user, values.classId, values.subjectId);
  const { error } = await supabase.from("student_subject_enrollments").insert({
    school_id: user.schoolId,
    class_id: values.classId,
    subject_id: values.subjectId,
    student_id: values.studentId,
    enrolled_by: user.id
  });
  if (error) throw new Error(error.message);
}

export async function assignTeacherWithSubjects(
  user: AppUser,
  values: { classId: string; teacherId: string; subjectIds: string[] }
) {
  const supabase = await createClient();
  const uniqueSubjectIds = [...new Set(values.subjectIds.filter(Boolean))];

  if (!uniqueSubjectIds.length) {
    const { error } = await supabase.from("teacher_assignments").insert({
      school_id: user.schoolId,
      teacher_id: values.teacherId,
      class_id: values.classId,
      subject_id: null
    });
    if (error) {
      if (error.code === "23505") throw new Error("Teacher is already assigned to this class.");
      throw new Error(error.message);
    }
    return;
  }

  for (const subjectId of uniqueSubjectIds) {
    const { data: existing, error: lookupError } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("class_id", values.classId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    const { error } = existing
      ? await supabase
          .from("teacher_assignments")
          .update({ teacher_id: values.teacherId })
          .eq("school_id", user.schoolId)
          .eq("id", existing.id)
      : await supabase.from("teacher_assignments").insert({
          school_id: user.schoolId,
          teacher_id: values.teacherId,
          class_id: values.classId,
          subject_id: subjectId
        });
    if (error) throw new Error(error.message);
  }

  await logActivity(user, "teacher_assigned", "class", values.classId, {
    teacher_id: values.teacherId,
    subject_ids: uniqueSubjectIds
  });
}

export async function createGrade(user: AppUser, values: { name: string; sort_order: number }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .insert({ school_id: user.schoolId, name: values.name.trim(), sort_order: values.sort_order })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSection(user: AppUser, values: { name: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sections")
    .insert({ school_id: user.schoolId, name: values.name.trim() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
