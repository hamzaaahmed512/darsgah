import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { studentSchema, type StudentFormValues } from "@/lib/validation/students";
import { logActivity } from "@/lib/services/activity";
import { getCustomCombinationOptionForClass, getDefaultCombinationOverrideForClass } from "@/lib/services/student-combinations";
import { isCustomStudentMajor, isDefaultStudentMajor, isSubjectExcludedForMajor, majorsForGrade, type MajorValue } from "@/lib/student-majors";
import { formatPakistaniPhoneForStorage } from "@/lib/pakistan-format";
import { formatDisplayName, splitFullName } from "@/lib/student-name";

export type StudentFilters = {
  q?: string;
  status?: string;
  classId?: string;
  page?: number;
};

export async function getStudents(user: AppUser, filters: StudentFilters = {}) {
  const supabase = await createClient();
  const isTeacher = user.role === "teacher" || user.role === "head_teacher";
  let headClassIds: string[] | null = null;

  if (isTeacher) {
    const { data, error } = await supabase
      .from("classes")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("head_teacher_id", user.id);
    if (error) throw new Error(error.message);
    headClassIds = (data ?? []).map((row) => row.id);
  }
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const directoryFields: string = isTeacher
    ? "id, first_name, last_name, preferred_name, name_en, name_ur, admission_number, status, class_id, class_name, grade_name, section_name, attendance_rate, gender, photo_url"
    : "id, first_name, last_name, preferred_name, name_en, name_ur, admission_number, status, class_id, class_name, grade_name, section_name, guardian_name, father_name_en, father_phone, attendance_rate, gender, photo_url";

  let query = supabase
    .from("student_directory")
    .select(directoryFields, { count: "exact" })
    .eq("school_id", user.schoolId)
    .range(from, to)
    .order("last_name");

  if (headClassIds) {
    query = headClassIds.length
      ? query.in("class_id", headClassIds)
      : query.eq("class_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.classId && filters.classId !== "all") query = query.eq("class_id", filters.classId);
  if (filters.q) {
    query = query.or(isTeacher
      ? `first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,name_en.ilike.%${filters.q}%,name_ur.ilike.%${filters.q}%,admission_number.ilike.%${filters.q}%`
      : `first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,name_en.ilike.%${filters.q}%,name_ur.ilike.%${filters.q}%,father_name_en.ilike.%${filters.q}%,father_phone.ilike.%${filters.q}%,admission_number.ilike.%${filters.q}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return { rows: (data ?? []) as any[], count: count ?? 0, page, pageSize };
}

export async function getStudent(user: AppUser, id: string) {
  const record = await getStudentRecord(user, id);
  return { student: record.student, guardians: record.guardians, attendance: record.attendance };
}

/**
 * Loads the complete, tenant-scoped record used by the student profile.  RLS is
 * deliberately left in place for teacher/class access; this service never uses
 * an admin client to broaden the viewer's access.
 */
export async function getStudentRecord(
  user: AppUser,
  id: string,
  filters: { attendanceFrom?: string; attendanceTo?: string; includeFinance?: boolean } = {}
) {
  const supabase = await createClient();
  const studentMajorsSupported = await supportsStudentMajors(supabase);
  const studentBioFieldsSupported = await supportsStudentBioFields(supabase);
  const isTeacher = user.role === "teacher" || user.role === "head_teacher";
  let headClassIds: string[] | null = null;

  if (isTeacher) {
    const { data, error } = await supabase
      .from("classes")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("head_teacher_id", user.id);
    if (error) throw new Error(error.message);
    headClassIds = (data ?? []).map((row) => row.id);
    if (!headClassIds.length) return emptyStudentRecord();
  }

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("id,attendance_date,status,note,classes(name,grades(name),sections(name))")
    .eq("school_id", user.schoolId)
    .eq("student_id", id)
    .order("attendance_date", { ascending: false });

  if (filters.attendanceFrom) attendanceQuery = attendanceQuery.gte("attendance_date", filters.attendanceFrom);
  if (filters.attendanceTo) attendanceQuery = attendanceQuery.lte("attendance_date", filters.attendanceTo);

  const studentFields: string = isTeacher
    ? `id, first_name, last_name, preferred_name, admission_number, status, class_id, class_name, grade_name, section_name, attendance_rate, gender, admission_date${studentMajorsSupported ? ", major" : ""}`
    : `id, first_name, last_name, preferred_name, name_en, name_ur, admission_number, status, class_id, class_name, grade_name, section_name, guardian_name, attendance_rate, date_of_birth, gender${studentBioFieldsSupported ? ", religion, father_alive" : ""}, father_name_en, father_name_ur, father_phone, father_cnic, photo_url, email, phone, address, admission_date${studentMajorsSupported ? ", major" : ""}`;
  let studentQuery = supabase
      .from("student_directory")
      .select(studentFields)
      .eq("school_id", user.schoolId)
      .eq("id", id);
  if (headClassIds) studentQuery = studentQuery.in("class_id", headClassIds);

  const [student, guardians, attendance, marks, challans] = await Promise.all([
    studentQuery.maybeSingle(),
    isTeacher
      ? Promise.resolve({ data: [], error: null })
      : supabase
      .from("student_guardian_details")
      .select("student_id, guardian_id, is_primary, full_name, relationship, email, phone, emergency_contact_name, emergency_contact_phone")
      .eq("school_id", user.schoolId)
      .eq("student_id", id)
      .order("is_primary", { ascending: false }),
    attendanceQuery,
    supabase
      .from("marks")
      .select("id,marks_obtained,grade,status,teacher_comment,exams(title,term,exam_type,exam_date,max_marks,approval_status),subjects(name)")
      .eq("school_id", user.schoolId)
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    filters.includeFinance
      ? supabase
          .from("fee_challans")
          .select("id,fee_month,amount,due_date,created_at,student_fee_accounts(total_payable,amount_paid)")
          .eq("school_id", user.schoolId)
          .eq("student_id", id)
          .order("fee_month", { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (student.error) throw new Error(student.error.message);
  if (guardians.error) throw new Error(guardians.error.message);
  if (attendance.error) throw new Error(attendance.error.message);
  if (marks.error) throw new Error(marks.error.message);
  if (challans.error) throw new Error(challans.error.message);

  const attendanceRows = attendance.data ?? [];
  const presentCount = attendanceRows.filter((row: any) => ["present", "late"].includes(row.status)).length;
  const marksRows = marks.data ?? [];
  const markPercentages = marksRows
    .map((row: any) => Number(row.exams?.max_marks) ? (Number(row.marks_obtained) / Number(row.exams.max_marks)) * 100 : null)
    .filter((value): value is number => value !== null);
  const challanRows = (challans.data ?? []).map((row: any) => {
    const account: any = row.student_fee_accounts;
    const outstanding = Math.max(0, Number(account?.total_payable ?? row.amount) - Number(account?.amount_paid ?? 0));
    return { ...row, outstanding, payment_status: outstanding <= 0 ? "paid" : Number(account?.amount_paid ?? 0) > 0 ? "partially paid" : "unpaid" };
  });

  return {
    student: student.data as any,
    guardians: guardians.data ?? [],
    attendance: attendanceRows,
    marks: marksRows,
    challans: challanRows,
    summaries: {
      attendance: { total: attendanceRows.length, present: presentCount, rate: attendanceRows.length ? (presentCount / attendanceRows.length) * 100 : null },
      exams: { total: marksRows.length, average: markPercentages.length ? markPercentages.reduce((sum, value) => sum + value, 0) / markPercentages.length : null },
      fees: { total: challanRows.length, outstanding: challanRows.reduce((sum, row) => sum + row.outstanding, 0) }
    }
  };
}

function emptyStudentRecord() {
  return {
    student: null,
    guardians: [],
    attendance: [],
    marks: [],
    challans: [],
    summaries: {
      attendance: { total: 0, present: 0, rate: null },
      exams: { total: 0, average: null },
      fees: { total: 0, outstanding: 0 }
    }
  };
}

export async function createStudent(user: AppUser, values: StudentFormValues) {
  const parsed = studentSchema.parse(values);
  const supabase = await createClient();
  const studentMajorsSupported = await supportsStudentMajors(supabase);
  const studentBioFieldsSupported = await supportsStudentBioFields(supabase);

  const isStaff = user.role === "student_staff";
  const initialStatus = isStaff ? "pending_approval" : parsed.status;

  const admissionNumber = parsed.admission_number || `ADM-${Date.now()}`;
  const phone = formatPakistaniPhoneForStorage(parsed.phone);
  const fatherPhone = formatPakistaniPhoneForStorage(parsed.father_phone);
  const guardianPhone = formatPakistaniPhoneForStorage(parsed.guardian_phone) ?? fatherPhone;
  const emergencyContactPhone = formatPakistaniPhoneForStorage(parsed.emergency_contact_phone);
  const studentName = splitFullName(parsed.name_en);
  if (studentMajorsSupported && parsed.class_id && parsed.major) {
    await assertMajorAvailableForClass(supabase, user, parsed.class_id, parsed.major);
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      school_id: user.schoolId,
      admission_number: admissionNumber,
      first_name: studentName.firstName,
      last_name: studentName.lastName,
      name_en: parsed.name_en,
      name_ur: parsed.name_ur || null,
      father_name_en: parsed.father_name_en || null,
      father_name_ur: parsed.father_name_ur || null,
      father_phone: fatherPhone,
      father_cnic: parsed.father_cnic || null,
      ...(studentBioFieldsSupported ? { father_alive: parsed.father_alive !== "no" } : {}),
      photo_url: parsed.photo_url || null,
      class_id: parsed.class_id || null,
      ...(studentMajorsSupported ? { major: parsed.major || null } : {}),
      date_of_birth: parsed.date_of_birth || null,
      gender: parsed.gender || null,
      ...(studentBioFieldsSupported ? { religion: parsed.religion } : {}),
      email: parsed.email || null,
      phone,
      address: parsed.address || null,
      admission_date: parsed.admission_date || new Date().toISOString().split("T")[0],
      status: initialStatus
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  let guardianId = null;

  if (parsed.guardian_name || parsed.father_name_en) {
    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .insert({
        school_id: user.schoolId,
        full_name: parsed.guardian_name || parsed.father_name_en,
        relationship: parsed.guardian_relationship || "Father",
        email: parsed.guardian_email || null,
        phone: guardianPhone,
        emergency_contact_name: parsed.emergency_contact_name || null,
        emergency_contact_phone: emergencyContactPhone
      })
      .select("id")
      .single();

    if (guardianError) throw new Error(guardianError.message);
    guardianId = guardian.id;

    await supabase.from("student_guardians").insert({
      school_id: user.schoolId,
      student_id: student.id,
      guardian_id: guardianId,
      is_primary: true
    });
  }

  if (parsed.class_id && initialStatus !== "pending_approval") {
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("is_active", true)
      .maybeSingle();
    await supabase.from("enrollments").insert({
      school_id: user.schoolId,
      student_id: student.id,
      class_id: parsed.class_id,
      academic_year_id: activeYear?.id,
      status: "active"
    });
  } else if (parsed.class_id && initialStatus === "pending_approval") {
    // We store the requested class assignment in the approval request metadata if needed,
    // or just rely on the form having passed it. We'll store it in metadata so the principal
    // can enroll them on approval.
    const { error: reqError } = await supabase.from("approval_requests").insert({
      school_id: user.schoolId,
      request_type: "admission",
      student_id: student.id,
      submitted_by: user.id,
      status: "pending",
      metadata: { requested_class_id: parsed.class_id }
    });
    if (reqError) throw new Error(reqError.message);
    await logActivity(user, "admission_request_submitted", "approval_request", student.id, {
      admission_number: parsed.admission_number,
      name: formatDisplayName(parsed.name_en)
    });
    return student.id as string;
  }

  if (!isStaff) {
    if (studentMajorsSupported && parsed.class_id && parsed.major) await removeExcludedStudentSubjects(user, student.id, parsed.class_id, parsed.major);
    await logActivity(user, "student_created", "student", student.id, {
      admission_number: parsed.admission_number,
      name: formatDisplayName(parsed.name_en)
    });
  }

  return student.id as string;
}

export async function updateStudent(user: AppUser, id: string, values: StudentFormValues) {
  const parsed = studentSchema.parse(values);
  const supabase = await createClient();
  const studentMajorsSupported = await supportsStudentMajors(supabase);
  const studentBioFieldsSupported = await supportsStudentBioFields(supabase);
  const phone = formatPakistaniPhoneForStorage(parsed.phone);
  const fatherPhone = formatPakistaniPhoneForStorage(parsed.father_phone);
  const guardianPhone = formatPakistaniPhoneForStorage(parsed.guardian_phone) ?? fatherPhone;
  const emergencyContactPhone = formatPakistaniPhoneForStorage(parsed.emergency_contact_phone);
  const studentName = splitFullName(parsed.name_en);
  if (studentMajorsSupported && parsed.class_id && parsed.major) {
    await assertMajorAvailableForClass(supabase, user, parsed.class_id, parsed.major);
  }
  const { error } = await supabase
    .from("students")
    .update({
      admission_number: parsed.admission_number,
      first_name: studentName.firstName,
      last_name: studentName.lastName,
      name_en: parsed.name_en,
      name_ur: parsed.name_ur || null,
      father_name_en: parsed.father_name_en || null,
      father_name_ur: parsed.father_name_ur || null,
      father_phone: fatherPhone,
      father_cnic: parsed.father_cnic || null,
      ...(studentBioFieldsSupported ? { father_alive: parsed.father_alive !== "no" } : {}),
      photo_url: parsed.photo_url || null,
      class_id: parsed.class_id || null,
      ...(studentMajorsSupported ? { major: parsed.major || null } : {}),
      date_of_birth: parsed.date_of_birth || null,
      gender: parsed.gender || null,
      ...(studentBioFieldsSupported ? { religion: parsed.religion } : {}),
      email: parsed.email || null,
      phone,
      address: parsed.address || null,
      admission_date: parsed.admission_date,
      status: parsed.status
    })
    .eq("school_id", user.schoolId)
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { data: guardianLink, error: guardianFetchError } = await supabase
    .from("student_guardians")
    .select("guardian_id")
    .eq("school_id", user.schoolId)
    .eq("student_id", id)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (guardianFetchError) throw new Error(guardianFetchError.message);

  if (guardianLink?.guardian_id) {
    const { error: guardianUpdateError } = await supabase
      .from("guardians")
      .update({
        full_name: parsed.guardian_name || parsed.father_name_en,
        relationship: parsed.guardian_relationship || "Father",
        email: parsed.guardian_email || null,
        phone: guardianPhone,
        emergency_contact_name: parsed.emergency_contact_name || null,
        emergency_contact_phone: emergencyContactPhone
      })
      .eq("school_id", user.schoolId)
      .eq("id", guardianLink.guardian_id);

    if (guardianUpdateError) throw new Error(guardianUpdateError.message);
  } else {
    const { data: guardian, error: guardianInsertError } = await supabase
      .from("guardians")
      .insert({
        school_id: user.schoolId,
        full_name: parsed.guardian_name || parsed.father_name_en,
        relationship: parsed.guardian_relationship || "Father",
        email: parsed.guardian_email || null,
        phone: guardianPhone,
        emergency_contact_name: parsed.emergency_contact_name || null,
        emergency_contact_phone: emergencyContactPhone
      })
      .select("id")
      .single();

    if (guardianInsertError) throw new Error(guardianInsertError.message);
    await supabase.from("student_guardians").insert({
      school_id: user.schoolId,
      student_id: id,
      guardian_id: guardian.id,
      is_primary: true
    });
  }

  // Handle class assignment: upsert or withdraw enrollment
  if (parsed.class_id) {
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("is_active", true)
      .maybeSingle();

    // Withdraw any other active enrollments first
    await supabase
      .from("enrollments")
      .update({ status: "withdrawn" })
      .eq("school_id", user.schoolId)
      .eq("student_id", id)
      .eq("status", "active")
      .neq("class_id", parsed.class_id);

    // Upsert the new enrollment
    const { error: enrollError } = await supabase
      .from("enrollments")
      .upsert(
        {
          school_id: user.schoolId,
          student_id: id,
          class_id: parsed.class_id,
          academic_year_id: activeYear?.id ?? null,
          status: "active"
        },
        { onConflict: "school_id,student_id,class_id,academic_year_id", ignoreDuplicates: false }
      );

    if (enrollError) throw new Error(enrollError.message);
    if (studentMajorsSupported && parsed.major) await removeExcludedStudentSubjects(user, id, parsed.class_id, parsed.major);
  } else {
    // No class selected — withdraw any active enrollments
    await supabase
      .from("enrollments")
      .update({ status: "withdrawn" })
      .eq("school_id", user.schoolId)
      .eq("student_id", id)
      .eq("status", "active");
  }

  await logActivity(user, "student_updated", "student", id, { admission_number: parsed.admission_number });
}

async function supportsStudentMajors(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from("students").select("major").limit(1);
  if (!error) return true;
  if (error.code === "42703" || error.message.includes("major does not exist")) return false;
  throw new Error(error.message);
}

async function supportsStudentBioFields(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from("student_directory").select("religion,father_alive").limit(1);
  if (!error) return true;
  if (error.code === "42703" || error.message.includes("does not exist")) return false;
  throw new Error(error.message);
}

export async function setStudentMajor(user: AppUser, values: { studentId: string; classId: string; major: MajorValue | string | null }) {
  const supabase = await createClient();
  if (!(await supportsStudentMajors(supabase))) {
    throw new Error("Student majors are not enabled in the database yet. Apply the pending student-major migration first.");
  }

  const [{ data: classRow, error: classError }, { data: enrollment, error: enrollmentError }] = await Promise.all([
    supabase.from("classes").select("grades(name)").eq("school_id", user.schoolId).eq("id", values.classId).maybeSingle(),
    supabase.from("enrollments").select("id").eq("school_id", user.schoolId).eq("class_id", values.classId).eq("student_id", values.studentId).eq("status", "active").maybeSingle()
  ]);
  if (classError) throw new Error(classError.message);
  if (enrollmentError) throw new Error(enrollmentError.message);
  if (!classRow || !enrollment) throw new Error("The student is not actively enrolled in this section.");
  const gradeName = (classRow as any).grades?.name ?? "";
  if (values.major) await assertMajorAvailableForClass(supabase, user, values.classId, values.major, gradeName);

  const { error } = await supabase.from("students").update({ major: values.major }).eq("school_id", user.schoolId).eq("id", values.studentId);
  if (error) throw new Error(error.message);
  if (values.major) await removeExcludedStudentSubjects(user, values.studentId, values.classId, values.major);
  await logActivity(user, "student_major_updated", "student", values.studentId, { class_id: values.classId, major: values.major });
}

async function assertMajorAvailableForClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: AppUser,
  classId: string,
  major: string,
  knownGradeName?: string
) {
  let gradeName = knownGradeName;
  if (!gradeName) {
    const { data: classRow, error } = await supabase.from("classes").select("grades(name)").eq("school_id", user.schoolId).eq("id", classId).maybeSingle();
    if (error) throw new Error(error.message);
    gradeName = (classRow as any)?.grades?.name ?? "";
  }

  if (isDefaultStudentMajor(major)) {
    if (!majorsForGrade(gradeName).includes(major)) throw new Error("That combination is not available for this grade.");
    return;
  }

  if (!isCustomStudentMajor(major)) throw new Error("That combination is not available for this grade.");
  const combination = await getCustomCombinationOptionForClass(supabase, user.schoolId, classId, major);
  if (!combination) throw new Error("That combination is not available for this class.");
}

async function removeExcludedStudentSubjects(user: AppUser, studentId: string, classId: string, major: MajorValue | string) {
  const supabase = await createClient();
  const [{ data: classRow, error: classError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("classes").select("grades(name)").eq("school_id", user.schoolId).eq("id", classId).maybeSingle(),
    supabase.from("class_subjects").select("subject_id,subjects(name)").eq("school_id", user.schoolId).eq("class_id", classId)
  ]);
  if (classError) throw new Error(classError.message);
  if (linksError) throw new Error(linksError.message);
  const gradeName = (classRow as any)?.grades?.name ?? "";

  if (isCustomStudentMajor(major)) {
    const combination = await getCustomCombinationOptionForClass(supabase, user.schoolId, classId, major);
    if (!combination) throw new Error("That combination is not available for this class.");
    const allowedIds = new Set(combination.subjectIds ?? []);
    const excludedIds = (links ?? []).filter((row: any) => !allowedIds.has(row.subject_id as string)).map((row: any) => row.subject_id as string);
    if (excludedIds.length) {
      const { error } = await supabase.from("student_subject_enrollments").delete().eq("school_id", user.schoolId).eq("student_id", studentId).eq("class_id", classId).in("subject_id", excludedIds);
      if (error) throw new Error(error.message);
    }
    const missingAllowedIds = [...allowedIds].filter((subjectId) => (links ?? []).some((row: any) => row.subject_id === subjectId));
    if (missingAllowedIds.length) {
      const { error } = await supabase.from("student_subject_enrollments").upsert(
        missingAllowedIds.map((subjectId) => ({ school_id: user.schoolId, student_id: studentId, class_id: classId, subject_id: subjectId, enrolled_by: user.id })),
        { onConflict: "school_id,student_id,subject_id,class_id" }
      );
      if (error) throw new Error(error.message);
    }
    return;
  }

  const defaultOverride = await getDefaultCombinationOverrideForClass(supabase, user.schoolId, classId, major);
  if (defaultOverride) {
    const allowedIds = new Set(defaultOverride.subjectIds ?? []);
    const excludedIds = (links ?? []).filter((row: any) => !allowedIds.has(row.subject_id as string)).map((row: any) => row.subject_id as string);
    if (excludedIds.length) {
      const { error } = await supabase.from("student_subject_enrollments").delete().eq("school_id", user.schoolId).eq("student_id", studentId).eq("class_id", classId).in("subject_id", excludedIds);
      if (error) throw new Error(error.message);
    }
    const missingAllowedIds = [...allowedIds].filter((subjectId) => (links ?? []).some((row: any) => row.subject_id === subjectId));
    if (missingAllowedIds.length) {
      const { error } = await supabase.from("student_subject_enrollments").upsert(
        missingAllowedIds.map((subjectId) => ({ school_id: user.schoolId, student_id: studentId, class_id: classId, subject_id: subjectId, enrolled_by: user.id })),
        { onConflict: "school_id,student_id,subject_id,class_id" }
      );
      if (error) throw new Error(error.message);
    }
    return;
  }

  const excludedIds = (links ?? []).filter((row: any) => isSubjectExcludedForMajor(gradeName, major, row.subjects?.name ?? "")).map((row: any) => row.subject_id as string);
  if (excludedIds.length) {
    const { error } = await supabase.from("student_subject_enrollments").delete().eq("school_id", user.schoolId).eq("student_id", studentId).eq("class_id", classId).in("subject_id", excludedIds);
    if (error) throw new Error(error.message);
  }

  if (major === "computer_economics_stats") {
    const statistics = (links ?? []).find((row: any) => (row.subjects?.name ?? "").trim().toLocaleLowerCase() === "statistics");
    if (statistics) {
      const { data: assignment } = await supabase.from("teacher_assignments").select("id").eq("school_id", user.schoolId).eq("class_id", classId).eq("subject_id", statistics.subject_id).maybeSingle();
      if (assignment) {
        const { error } = await supabase.from("student_subject_enrollments").upsert({ school_id: user.schoolId, student_id: studentId, class_id: classId, subject_id: statistics.subject_id, enrolled_by: user.id }, { onConflict: "school_id,student_id,subject_id,class_id" });
        if (error) throw new Error(error.message);
      }
    }
  }
}

export async function archiveStudent(user: AppUser, id: string) {
  const supabase = await createClient();
  
  if (user.role === "student_staff") {
    // Route to pending cancellation workflow
    const { error: updateError } = await supabase
      .from("students")
      .update({ status: "pending_cancellation" })
      .eq("school_id", user.schoolId)
      .eq("id", id);
      
    if (updateError) throw new Error(updateError.message);

    const { error: reqError } = await supabase.from("approval_requests").insert({
      school_id: user.schoolId,
      request_type: "cancellation",
      student_id: id,
      submitted_by: user.id,
      status: "pending"
    });

    if (reqError) throw new Error(reqError.message);
    await logActivity(user, "cancellation_request_submitted", "approval_request", id);
    return;
  }

  // Direct archive for principal/admin
  const { error } = await supabase
    .from("students")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("school_id", user.schoolId)
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { error: enrollError } = await supabase
    .from("enrollments")
    .update({ status: "withdrawn", ends_on: new Date().toISOString().slice(0, 10) })
    .eq("school_id", user.schoolId)
    .eq("student_id", id)
    .eq("status", "active");

  if (enrollError) throw new Error(enrollError.message);
  await logActivity(user, "student_archived", "student", id);
}

export async function exportStudents(user: AppUser, filters: StudentFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("student_directory")
    .select("admission_number, name_en, name_ur, father_name_en, father_phone, gender, class_name, grade_name, section_name, status, date_of_birth, email, phone, address")
    .eq("school_id", user.schoolId)
    .order("last_name");

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.classId && filters.classId !== "all") query = query.eq("class_id", filters.classId);
  if (filters.q) query = query.or(`first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,name_en.ilike.%${filters.q}%,name_ur.ilike.%${filters.q}%,father_name_en.ilike.%${filters.q}%,father_phone.ilike.%${filters.q}%,admission_number.ilike.%${filters.q}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) return [];
  
  return data.map(s => ({
    "Admission No": s.admission_number || "",
    "Name (EN)": s.name_en || "",
    "Name (UR)": s.name_ur || "",
    "Father Name": s.father_name_en || "",
    "Father Phone": s.father_phone || "",
    "Gender": s.gender || "",
    "Grade": s.grade_name || "",
    "Class": s.class_name || "",
    "Section": s.section_name || "",
    "Status": s.status || "",
    "DOB": s.date_of_birth || "",
    "Email": s.email || "",
    "Phone": s.phone || "",
    "Address": s.address || ""
  }));
}

export async function importStudentsBulk(user: AppUser, records: any[]) {
  const supabase = await createClient();
  
  const { data: classes } = await supabase.from("classes").select("id, name").eq("school_id", user.schoolId);
  const classMap = new Map(classes?.map(c => [c.name.toLowerCase(), c.id]) || []);

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("is_active", true)
    .maybeSingle();

  const studentsToInsert = records.map(r => {
    const classId = r.class_name ? classMap.get(r.class_name.toLowerCase()) : null;
    const studentName = splitFullName(r.name_en);
    return {
      school_id: user.schoolId,
      admission_number: r.admission_number || `ADM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      first_name: studentName.firstName || "Unknown",
      last_name: studentName.lastName,
      name_en: r.name_en || null,
      name_ur: r.name_ur || null,
      father_name_en: r.father_name_en || null,
      father_phone: formatPakistaniPhoneForStorage(r.father_phone),
      class_id: classId,
      gender: r.gender || null,
      date_of_birth: r.date_of_birth || null,
      status: r.status || "active",
      admission_date: new Date().toISOString().split("T")[0]
    };
  });
  
  const { data: insertedStudents, error: studentError } = await supabase
    .from("students")
    .insert(studentsToInsert)
    .select("id, class_id, status");

  if (studentError) throw new Error("Bulk insert failed: " + studentError.message);

  if (insertedStudents && activeYear) {
    const enrollments = insertedStudents
      .filter(s => s.class_id && s.status === "active")
      .map(s => ({
        school_id: user.schoolId,
        student_id: s.id,
        class_id: s.class_id,
        academic_year_id: activeYear.id,
        status: "active"
      }));

    if (enrollments.length > 0) {
      await supabase.from("enrollments").insert(enrollments);
    }
  }
  
  return insertedStudents?.length || 0;
}
