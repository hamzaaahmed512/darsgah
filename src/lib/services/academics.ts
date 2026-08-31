import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { logActivity } from "@/lib/services/activity";
import { canonicalSubjectName, getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";
import { isSubjectExcludedForMajor } from "@/lib/student-majors";
import { formatDisplayName, formatStudentName } from "@/lib/student-name";
import { formatClassDisplayName, formatGradeSection } from "@/lib/utils";
import { getCombinationOptionsForClass, getCustomCombinationOptionsForClass } from "@/lib/services/student-combinations";


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

  const subjectCatalog = [...new Map((subjects.data ?? []).map((subject) => [canonicalSubjectName(subject.name), subject])).values()];

  return {
    years: years.data ?? [],
    grades: grades.data ?? [],
    sections: sections.data ?? [],
    subjects: subjectCatalog,
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
      head_teacher_name: formatDisplayName(row.head_teacher?.full_name) || null,
      head_teacher_email: row.head_teacher?.email ?? null
    }))
  };
}

function normalizeSectionName(name: string) {
  return name
    .trim()
    .replace(/^section\s+/i, "")
    .replace(/^sec\s+/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function buildCanonicalClassName(gradeName: string, sectionName?: string | null) {
  const formatted = formatGradeSection(gradeName, sectionName ?? null);
  return formatted || gradeName.trim().toUpperCase();
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
    name: formatClassDisplayName(row.classes?.grades?.name, row.classes?.name, row.classes?.sections?.name),
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
    name: formatClassDisplayName(row.grades?.name, row.name, row.sections?.name),
    room: row.room,
    grade_name: row.grades?.name,
    section_name: row.sections?.name,
    academic_year_name: row.academic_years?.name,
    attendance_marked_today: Boolean(row.attendance_sessions?.length)
  }));
}

export async function principalCanAccessAcademicControl(user: AppUser) {
  if (user.role !== "principal") return false;
  const supabase = await createClient();

  const [memberResult, headClassResult, assignmentResult] = await Promise.all([
    supabase
      .from("school_members")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("user_id", user.id)
      .in("role", ["teacher", "head_teacher"])
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("classes")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("head_teacher_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("teacher_assignments")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("teacher_id", user.id)
      .limit(1)
      .maybeSingle()
  ]);

  if (memberResult.error) throw new Error(memberResult.error.message);
  if (headClassResult.error) throw new Error(headClassResult.error.message);
  if (assignmentResult.error) throw new Error(assignmentResult.error.message);

  return Boolean(memberResult.data || headClassResult.data || assignmentResult.data);
}

export async function assertPrincipalAcademicControlAccess(user: AppUser) {
  if (!(await principalCanAccessAcademicControl(user))) {
    throw new Error("Academic Control is available only when the principal has an active teaching assignment in this school.");
  }
}

async function assertHeadTeacher(user: AppUser, teacherId: string | null | undefined) {
  if (!teacherId) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_members")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("user_id", teacherId)
    .in("role", ["teacher", "head_teacher", "principal"])
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Head teacher must be an active teacher or principal in this school.");
}

export async function createClass(user: AppUser, data: { name: string; grade_id: string; section_id?: string | null; academic_year_id: string; room?: string | null; head_teacher_id?: string | null }) {
  await assertHeadTeacher(user, data.head_teacher_id);
  const supabase = await createClient();

  const [{ data: grade, error: gradeError }, { data: section, error: sectionError }] = await Promise.all([
    supabase
      .from("grades")
      .select("name")
      .eq("school_id", user.schoolId)
      .eq("id", data.grade_id)
      .maybeSingle(),
    data.section_id
      ? supabase
          .from("sections")
          .select("name")
          .eq("school_id", user.schoolId)
          .eq("id", data.section_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (gradeError) throw new Error(gradeError.message);
  if (sectionError) throw new Error(sectionError.message);
  if (!grade) throw new Error("Grade not found.");

  const canonicalName = buildCanonicalClassName(grade.name, section?.name);

  const { data: createdClass, error } = await supabase
    .from("classes")
    .insert({
      school_id: user.schoolId,
      name: canonicalName,
      grade_id: data.grade_id,
      section_id: data.section_id || null,
      academic_year_id: data.academic_year_id,
      room: data.room || null,
      head_teacher_id: data.head_teacher_id || null
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (grade?.name) {
    await seedDefaultSubjectsForClass(user, createdClass.id, grade.name);
  }

  return createdClass.id;
}

export async function updateClass(user: AppUser, classId: string, data: { name: string; grade_id: string; section_id?: string | null; academic_year_id: string; room?: string | null; head_teacher_id?: string | null }) {
  await assertHeadTeacher(user, data.head_teacher_id);
  const supabase = await createClient();
  const [{ data: grade, error: gradeError }, { data: section, error: sectionError }] = await Promise.all([
    supabase
      .from("grades")
      .select("name")
      .eq("school_id", user.schoolId)
      .eq("id", data.grade_id)
      .maybeSingle(),
    data.section_id
      ? supabase
          .from("sections")
          .select("name")
          .eq("school_id", user.schoolId)
          .eq("id", data.section_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (gradeError) throw new Error(gradeError.message);
  if (sectionError) throw new Error(sectionError.message);
  if (!grade) throw new Error("Grade not found.");

  const canonicalName = buildCanonicalClassName(grade.name, section?.name);
  const { error } = await supabase
    .from("classes")
    .update({
      name: canonicalName,
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
      teacher_name: formatDisplayName(a.profiles?.full_name) || "Unknown",
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
  const selectedClass = options.classes.find((item) => item.id === selectedClassId);
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

  const rosterStudentIds = (roster.data ?? []).map((row: any) => row.student_id as string);
  const majorsByStudentId = await getStudentMajors(supabase, user.schoolId, rosterStudentIds);
  const customCombinations = selectedClassId ? await getCustomCombinationOptionsForClass(supabase, user.schoolId, selectedClassId) : [];
  const customCombinationsByValue = new Map(customCombinations.map((option) => [option.value, option]));
  const combinationOptions = selectedClassId ? await getCombinationOptionsForClass(user, selectedClassId, selectedClass?.grade_name ?? "") : [];
  const defaultCombinationsByValue = new Map(combinationOptions.filter((option) => option.kind === "default" && option.subjectIds?.length).map((option) => [option.value, option]));
  const eligibleRosterRows = (roster.data ?? []).filter((row: any) =>
    !selectedSubject ||
    (customCombinationsByValue.has(majorsByStudentId[row.student_id] as any)
      ? customCombinationsByValue.get(majorsByStudentId[row.student_id] as any)?.subjectIds?.includes(selectedSubject.id)
      : defaultCombinationsByValue.has(majorsByStudentId[row.student_id] as any)
        ? defaultCombinationsByValue.get(majorsByStudentId[row.student_id] as any)?.subjectIds?.includes(selectedSubject.id)
      : !isSubjectExcludedForMajor(selectedClass?.grade_name ?? "", majorsByStudentId[row.student_id], selectedSubject.name))
  );

  const defaultEnrolledStudentIds = isElectiveSubject
    ? enrolledStudentIds
    : new Set(eligibleRosterRows.map((row: any) => row.student_id));

  return {
    ...options,
    catalogSubjects: options.subjects,
    subjects: availableSubjects,
    teachers: (teachers.data ?? []).map((row: any) => ({ id: row.user_id, name: formatDisplayName(row.profiles?.full_name) || "Unknown" })),
    selectedClassId,
    selectedSubjectId,
    selectedSubject,
    assignments: (assignments.data ?? []).map((row: any) => ({
      ...row,
      profiles: row.profiles ? { ...row.profiles, full_name: formatDisplayName(row.profiles.full_name) } : row.profiles
    })),
    roster: eligibleRosterRows.map((row: any) => ({ id: row.student_id, name: formatStudentName({ firstName: row.students?.first_name, lastName: row.students?.last_name }), admission_number: row.students?.admission_number, major: majorsByStudentId[row.student_id] ?? null })),
    combinationOptions,
    enrolledStudentIds: defaultEnrolledStudentIds,
    savedEnrolledStudentIds: enrolledStudentIds,
    electiveOptions,
    isElectiveSubject,
    studentElectiveByStudentId
  };
}

export async function createSubject(user: AppUser, values: { name: string; code?: string; is_elective?: boolean }) {
  const supabase = await createClient();
  const subjectName = values.name.trim().replace(/\s+/g, " ");
  if (!subjectName) throw new Error("Subject name is required.");
  const { data: catalog, error: lookupError } = await supabase.from("subjects").select("id,name").eq("school_id", user.schoolId);
  if (lookupError) throw new Error(lookupError.message);
  if ((catalog ?? []).some((subject) => canonicalSubjectName(subject.name) === canonicalSubjectName(subjectName))) {
    throw new Error(`“${subjectName}” already exists in the subject catalog.`);
  }
  const { error } = await supabase.from("subjects").insert({
    school_id: user.schoolId,
    name: subjectName,
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
  const subjectName = values.name.trim().replace(/\s+/g, " ");
  if (!subjectName) throw new Error("Subject name is required.");

  const { data: catalog, error: lookupError } = await supabase
    .from("subjects")
    .select("id,name")
    .eq("school_id", user.schoolId);
  if (lookupError) throw new Error(lookupError.message);

  const existingSubject = (catalog ?? []).find((subject) =>
    canonicalSubjectName(subject.name) === canonicalSubjectName(subjectName)
  );

  if (values.isClassSpecific && existingSubject) {
    throw new Error(`“${existingSubject.name}” already exists. Select it from Existing subjects instead.`);
  }

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

export async function linkExistingClassSubject(user: AppUser, values: { classId: string; subjectId: string }) {
  const supabase = await createClient();
  const { data: subject, error: subjectError } = await supabase.from("subjects").select("id,name").eq("school_id", user.schoolId).eq("id", values.subjectId).maybeSingle();
  if (subjectError) throw new Error(subjectError.message);
  if (!subject) throw new Error("Subject not found in this school.");
  const { data: existing, error: existingError } = await supabase.from("class_subjects").select("id").eq("school_id", user.schoolId).eq("class_id", values.classId).eq("subject_id", subject.id).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) throw new Error(`${subject.name} is already linked to this section.`);
  const { error } = await supabase.from("class_subjects").insert({ school_id: user.schoolId, class_id: values.classId, subject_id: subject.id, is_class_specific: false });
  if (error) throw new Error(error.message);
}

export async function removeClassSubject(user: AppUser, classSubjectId: string) {
  const supabase = await createClient();
  const { data: link, error: lookupError } = await supabase
    .from("class_subjects")
    .select("id,class_id,subject_id")
    .eq("school_id", user.schoolId)
    .eq("id", classSubjectId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!link) throw new Error("Subject link not found.");

  await supabase
    .from("teacher_assignments")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("class_id", link.class_id)
    .eq("subject_id", link.subject_id);

  await supabase
    .from("student_subject_enrollments")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("class_id", link.class_id)
    .eq("subject_id", link.subject_id);

  const { error } = await supabase
    .from("class_subjects")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("id", classSubjectId);
  if (error) throw new Error(error.message);
}

export async function seedDefaultSubjectsForClass(user: AppUser, classId: string, gradeName: string) {
  const defaults = getDefaultSubjectsForGrade(gradeName);
  if (!defaults.length) return { linkedCount: 0 };

  const supabase = await createClient();
  const { data: existingSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id,name,is_elective")
    .eq("school_id", user.schoolId);
  if (subjectsError) throw new Error(subjectsError.message);

  const subjectMap = new Map((existingSubjects ?? []).map((subject) => [canonicalSubjectName(subject.name), subject]));
  const subjectIds: string[] = [];

  for (const subjectDefault of defaults) {
    const key = canonicalSubjectName(subjectDefault.name);
    const existing = subjectMap.get(key);
    if (existing) {
      if (subjectDefault.is_elective && !existing.is_elective) {
        await supabase.from("subjects").update({ is_elective: true }).eq("school_id", user.schoolId).eq("id", existing.id);
      }
      subjectIds.push(existing.id);
      continue;
    }

    const { data: createdSubject, error } = await supabase
      .from("subjects")
      .insert({
        school_id: user.schoolId,
        name: subjectDefault.name,
        is_elective: Boolean(subjectDefault.is_elective)
      })
      .select("id,name,is_elective")
      .single();
    if (error) throw new Error(error.message);
    subjectMap.set(key, createdSubject);
    subjectIds.push(createdSubject.id);
  }

  const links = subjectIds.map((subjectId) => ({
    school_id: user.schoolId,
    class_id: classId,
    subject_id: subjectId,
    is_class_specific: false
  }));

  const { error: linkError } = await supabase.from("class_subjects").upsert(links, {
    onConflict: "school_id,class_id,subject_id"
  });
  if (linkError && linkError.code !== "42P01") throw new Error(linkError.message);

  return { linkedCount: subjectIds.length };
}

export async function getClassStudentRoster(user: AppUser, classId: string) {
  const supabase = await createClient();

  const [rosterResult, classSubjectsResult, enrollmentsResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id,students(first_name,last_name,admission_number)")
      .eq("school_id", user.schoolId)
      .eq("class_id", classId)
      .eq("status", "active")
      .order("created_at"),
    supabase
      .from("class_subjects")
      .select("subject_id,subjects(id,name,is_elective)")
      .eq("school_id", user.schoolId)
      .eq("class_id", classId),
    supabase
      .from("student_subject_enrollments")
      .select("student_id,subject_id,subjects(id,name,is_elective)")
      .eq("school_id", user.schoolId)
      .eq("class_id", classId)
  ]);

  if (rosterResult.error) throw new Error(rosterResult.error.message);
  if (classSubjectsResult.error) throw new Error(classSubjectsResult.error.message);
  if (enrollmentsResult.error) throw new Error(enrollmentsResult.error.message);

  const electiveOptions = (classSubjectsResult.data ?? [])
    .filter((row: any) => Boolean(row.subjects?.is_elective))
    .map((row: any) => ({ id: row.subjects.id as string, name: row.subjects.name as string }));

  const electiveSubjectIds = new Set(electiveOptions.map((option) => option.id));
  const studentElectiveByStudentId: Record<string, string | null> = {};

  for (const row of enrollmentsResult.data ?? []) {
    const enrollment = row as any;
    if (!electiveSubjectIds.has(enrollment.subject_id)) continue;
    studentElectiveByStudentId[enrollment.student_id] = enrollment.subject_id;
  }

  const rosterStudentIds = (rosterResult.data ?? []).map((row: any) => row.student_id as string);
  const majorsByStudentId = await getStudentMajors(supabase, user.schoolId, rosterStudentIds);
  const classRow = await supabase.from("classes").select("grades(name)").eq("school_id", user.schoolId).eq("id", classId).maybeSingle();
  if (classRow.error) throw new Error(classRow.error.message);
  const combinationOptions = await getCombinationOptionsForClass(user, classId, (classRow.data as any)?.grades?.name ?? "");
  const roster = (rosterResult.data ?? []).map((row: any) => ({
    id: row.student_id as string,
    name: formatStudentName({ firstName: row.students?.first_name, lastName: row.students?.last_name }),
    admission_number: row.students?.admission_number as string | null,
    major: majorsByStudentId[row.student_id] ?? null
  }));

  return { roster, electiveOptions, studentElectiveByStudentId, combinationOptions };
}

async function getStudentMajors(supabase: Awaited<ReturnType<typeof createClient>>, schoolId: string, studentIds: string[]) {
  if (!studentIds.length) return {} as Record<string, string | null>;
  const { data, error } = await supabase.from("students").select("id,major").eq("school_id", schoolId).in("id", studentIds);
  if (error) {
    if (error.code === "42703" || error.message.includes("major does not exist")) return {} as Record<string, string | null>;
    throw new Error(error.message);
  }
  return Object.fromEntries((data ?? []).map((student: any) => [student.id, student.major ?? null]));
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
  const eligibleStudentIds = await filterEligibleStudentIds(user, values.classId, values.subjectId, values.studentIds);
  if (!eligibleStudentIds.length) return;
  const { error } = await supabase.from("student_subject_enrollments").insert(eligibleStudentIds.map((student_id) => ({ school_id: user.schoolId, class_id: values.classId, subject_id: values.subjectId, student_id, enrolled_by: user.id })));
  if (error) throw new Error(error.message);
}

async function filterEligibleStudentIds(user: AppUser, classId: string, subjectId: string, studentIds: string[]) {
  const supabase = await createClient();
  const [{ data: classRow, error: classError }, { data: subject, error: subjectError }, { data: students, error: studentsError }] = await Promise.all([
    supabase.from("classes").select("grades(name)").eq("school_id", user.schoolId).eq("id", classId).maybeSingle(),
    supabase.from("subjects").select("name").eq("school_id", user.schoolId).eq("id", subjectId).maybeSingle(),
    supabase.from("students").select("id").eq("school_id", user.schoolId).in("id", studentIds)
  ]);
  if (classError) throw new Error(classError.message);
  if (subjectError) throw new Error(subjectError.message);
  if (studentsError) throw new Error(studentsError.message);
  const gradeName = (classRow as any)?.grades?.name ?? "";
  const subjectName = subject?.name ?? "";
  const majorsByStudentId = await getStudentMajors(supabase, user.schoolId, (students ?? []).map((student: any) => student.id));
  const customCombinations = await getCustomCombinationOptionsForClass(supabase, user.schoolId, classId);
  const customCombinationsByValue = new Map(customCombinations.map((option) => [option.value, option]));
  const combinationOptions = await getCombinationOptionsForClass(user, classId, gradeName);
  const defaultCombinationsByValue = new Map(combinationOptions.filter((option) => option.kind === "default" && option.subjectIds?.length).map((option) => [option.value, option]));
  return (students ?? []).filter((student: any) => {
    const major = majorsByStudentId[student.id] as string | null;
    const customCombination = customCombinationsByValue.get(major as any);
    if (customCombination) return customCombination.subjectIds?.includes(subjectId);
    const defaultCombination = defaultCombinationsByValue.get(major as any);
    if (defaultCombination) return defaultCombination.subjectIds?.includes(subjectId);
    return !isSubjectExcludedForMajor(gradeName, major, subjectName);
  }).map((student: any) => student.id as string);
}

export async function setStudentElectiveEnrollment(
  user: AppUser,
  values: { classId: string; studentId: string; subjectId: string | null; electiveGroupSubjectIds: string[] }
) {
  const supabase = await createClient();
  if (values.subjectId) {
    await assertSubjectLinkedToClass(user, values.classId, values.subjectId);
    const [eligibleStudentId] = await filterEligibleStudentIds(user, values.classId, values.subjectId, [values.studentId]);
    if (!eligibleStudentId) throw new Error("This subject is not available for the student's selected major.");
  }
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
  const sectionName = normalizeSectionName(values.name);
  if (!sectionName) throw new Error("Section name is required.");
  const { data: existingSections, error: lookupError } = await supabase.from("sections").select("id,name").eq("school_id", user.schoolId);
  if (lookupError) throw new Error(lookupError.message);
  const existing = (existingSections ?? []).find((section) => normalizeSectionName(section.name) === sectionName);
  if (existing) return { id: existing.id };
  const { data, error } = await supabase
    .from("sections")
    .insert({ school_id: user.schoolId, name: sectionName })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSectionClass(
  user: AppUser,
  values: { gradeId: string; gradeName: string; sectionName: string; room?: string | null }
) {
  const supabase = await createClient();
  const sectionName = normalizeSectionName(values.sectionName);
  if (!sectionName) throw new Error("Section name is required.");

  const [{ data: grade, error: gradeError }, { data: activeYear, error: yearError }, { data: sections, error: sectionsError }] = await Promise.all([
    supabase.from("grades").select("id,name").eq("school_id", user.schoolId).eq("id", values.gradeId).maybeSingle(),
    supabase.from("academic_years").select("id").eq("school_id", user.schoolId).eq("is_active", true).order("starts_on", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sections").select("id,name").eq("school_id", user.schoolId)
  ]);
  if (gradeError) throw new Error(gradeError.message);
  if (yearError) throw new Error(yearError.message);
  if (sectionsError) throw new Error(sectionsError.message);
  if (!grade) throw new Error("Grade not found.");
  if (!activeYear) throw new Error("Create or activate an academic year first.");

  let sectionId = (sections ?? []).find((section) => normalizeSectionName(section.name) === sectionName)?.id;
  if (!sectionId) sectionId = (await createSection(user, { name: sectionName })).id;

  const { data: existingClass, error: existingError } = await supabase
    .from("classes")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("academic_year_id", activeYear.id)
    .eq("grade_id", grade.id)
    .eq("section_id", sectionId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existingClass) throw new Error(`${grade.name} Section ${sectionName} already exists.`);

  const { data: created, error } = await supabase.from("classes").insert({
    school_id: user.schoolId,
    academic_year_id: activeYear.id,
    grade_id: grade.id,
    section_id: sectionId,
    name: buildCanonicalClassName(grade.name, sectionName),
    room: values.room?.trim() || null
  }).select("id").single();
  if (error) throw new Error(error.message);
  await seedDefaultSubjectsForClass(user, created.id, grade.name);
  return created;
}
