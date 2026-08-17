import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { studentSchema, type StudentFormValues } from "@/lib/validation/students";
import { logActivity } from "@/lib/services/activity";

export type StudentFilters = {
  q?: string;
  status?: string;
  classId?: string;
  page?: number;
};

export async function getStudents(user: AppUser, filters: StudentFilters = {}) {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("student_directory")
    .select(
      "id, first_name, last_name, preferred_name, admission_number, status, class_id, class_name, grade_name, section_name, guardian_name, attendance_rate",
      { count: "exact" }
    )
    .eq("school_id", user.schoolId)
    .range(from, to)
    .order("last_name");

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.classId && filters.classId !== "all") query = query.eq("class_id", filters.classId);
  if (filters.q) query = query.or(`first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,admission_number.ilike.%${filters.q}%`);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize };
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
  let attendanceQuery = supabase
    .from("attendance_records")
    .select("id,attendance_date,status,note,classes(name)")
    .eq("school_id", user.schoolId)
    .eq("student_id", id)
    .order("attendance_date", { ascending: false });

  if (filters.attendanceFrom) attendanceQuery = attendanceQuery.gte("attendance_date", filters.attendanceFrom);
  if (filters.attendanceTo) attendanceQuery = attendanceQuery.lte("attendance_date", filters.attendanceTo);

  const [student, guardians, attendance, marks, challans] = await Promise.all([
    supabase
      .from("student_directory")
      .select(
        "id, first_name, last_name, preferred_name, admission_number, status, class_id, class_name, grade_name, section_name, guardian_name, attendance_rate, date_of_birth, gender, email, phone, address, admission_date"
      )
      .eq("school_id", user.schoolId)
      .eq("id", id)
      .maybeSingle(),
    supabase
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
    student: student.data,
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

export async function createStudent(user: AppUser, values: StudentFormValues) {
  const parsed = studentSchema.parse(values);
  const supabase = await createClient();

  const isStaff = user.role === "student_staff";
  const initialStatus = isStaff ? "pending_approval" : parsed.status;

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      school_id: user.schoolId,
      admission_number: parsed.admission_number,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      preferred_name: parsed.preferred_name || null,
      date_of_birth: parsed.date_of_birth,
      gender: parsed.gender || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      admission_date: parsed.admission_date,
      status: initialStatus
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { data: guardian, error: guardianError } = await supabase
    .from("guardians")
    .insert({
      school_id: user.schoolId,
      full_name: parsed.guardian_name,
      relationship: parsed.guardian_relationship,
      email: parsed.guardian_email || null,
      phone: parsed.guardian_phone,
      emergency_contact_name: parsed.emergency_contact_name,
      emergency_contact_phone: parsed.emergency_contact_phone
    })
    .select("id")
    .single();

  if (guardianError) throw new Error(guardianError.message);

  await supabase.from("student_guardians").insert({
    school_id: user.schoolId,
    student_id: student.id,
    guardian_id: guardian.id,
    is_primary: true
  });

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
      name: `${parsed.first_name} ${parsed.last_name}`
    });
    return student.id as string;
  }

  if (!isStaff) {
    await logActivity(user, "student_created", "student", student.id, {
      admission_number: parsed.admission_number,
      name: `${parsed.first_name} ${parsed.last_name}`
    });
  }

  return student.id as string;
}

export async function updateStudent(user: AppUser, id: string, values: StudentFormValues) {
  const parsed = studentSchema.parse(values);
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      admission_number: parsed.admission_number,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      preferred_name: parsed.preferred_name || null,
      date_of_birth: parsed.date_of_birth,
      gender: parsed.gender || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
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
        full_name: parsed.guardian_name,
        relationship: parsed.guardian_relationship,
        email: parsed.guardian_email || null,
        phone: parsed.guardian_phone,
        emergency_contact_name: parsed.emergency_contact_name,
        emergency_contact_phone: parsed.emergency_contact_phone
      })
      .eq("school_id", user.schoolId)
      .eq("id", guardianLink.guardian_id);

    if (guardianUpdateError) throw new Error(guardianUpdateError.message);
  } else {
    const { data: guardian, error: guardianInsertError } = await supabase
      .from("guardians")
      .insert({
        school_id: user.schoolId,
        full_name: parsed.guardian_name,
        relationship: parsed.guardian_relationship,
        email: parsed.guardian_email || null,
        phone: parsed.guardian_phone,
        emergency_contact_name: parsed.emergency_contact_name,
        emergency_contact_phone: parsed.emergency_contact_phone
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
