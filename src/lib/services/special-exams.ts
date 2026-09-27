import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/services/activity";
import type { AppUser } from "@/types/database";

function isMissingSpecialExamSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST200" ||
    error.code === "PGRST201" ||
    error.code === "42703" ||
    error.message?.includes("exams.assigned_teacher_id") ||
    error.message?.includes("exams.is_special") ||
    error.message?.includes("between 'exams' and 'profiles'")
  );
}

function missingSpecialExamMessage() {
  return "Special exams are not available because the latest School OS database migration has not been applied.";
}

export async function getSpecialExamSetup(user: AppUser) {
  const supabase = await createClient();
  const [assignments, exams] = await Promise.all([
    supabase
      .from("teacher_assignments")
      .select("teacher_id,class_id,subject_id,profiles!teacher_assignments_teacher_id_fkey(full_name,email),classes(name,grades(name),sections(name)),subjects(name)")
      .eq("school_id", user.schoolId)
      .not("subject_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("exams")
      .select("id,title,exam_date,max_marks,status,approval_status,assigned_teacher_id,classes(name,grades(name),sections(name)),subjects(name)")
      .eq("school_id", user.schoolId)
      .eq("is_special", true)
      .order("created_at", { ascending: false })
  ]);

  if (assignments.error) throw new Error(assignments.error.message);
  const mappedAssignments = (assignments.data ?? []).map((row: any) => ({
    teacher_id: row.teacher_id,
    teacher_name: row.profiles?.full_name ?? row.profiles?.email ?? "Teacher",
    class_id: row.class_id,
    class_name: row.classes?.name,
    grade_name: row.classes?.grades?.name,
    section_name: row.classes?.sections?.name,
    subject_id: row.subject_id,
    subject_name: row.subjects?.name
  }));

  if (isMissingSpecialExamSchema(exams.error)) {
    return {
      assignments: mappedAssignments,
      exams: [],
      migrationRequired: true
    };
  }
  if (exams.error) throw new Error(exams.error.message);

  const examRows = exams.data ?? [];
  const teacherIds = Array.from(new Set(examRows.map((exam: any) => exam.assigned_teacher_id).filter(Boolean)));
  const teacherNames = new Map<string, string>();

  if (teacherIds.length) {
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", teacherIds);

    for (const teacher of teachers ?? []) {
      teacherNames.set(teacher.id, teacher.full_name ?? "Assigned teacher");
    }
  }

  return {
    assignments: mappedAssignments,
    exams: examRows.map((exam: any) => ({
      ...exam,
      teacher: {
        full_name: teacherNames.get(exam.assigned_teacher_id) ?? null
      }
    })),
    migrationRequired: false
  };
}

export async function createSpecialExam(user: AppUser, formData: FormData) {
  if (!hasPermission(user.role, "special-exams:manage", user.permissions)) throw new Error("Unauthorized to create special exams.");
  const assignmentKey = String(formData.get("assignment_key") ?? "");
  const [teacherId, classId, subjectId] = assignmentKey.split(":");
  if (!teacherId || !classId || !subjectId) throw new Error("Choose a teacher, class, and subject assignment.");

  const supabase = await createClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (assignmentError) throw new Error(assignmentError.message);
  if (!assignment) throw new Error("The selected teacher is not assigned to that class and subject.");

  const { data, error } = await supabase
    .from("exams")
    .insert({
      school_id: user.schoolId,
      class_id: classId,
      subject_id: subjectId,
      exam_type: "monthly",
      assessment_category: "major",
      requires_approval: true,
      title: String(formData.get("title") ?? "").trim(),
      term: String(formData.get("term") ?? "Special Exams").trim() || "Special Exams",
      exam_date: String(formData.get("exam_date") ?? new Date().toISOString().slice(0, 10)),
      max_marks: Number(formData.get("max_marks") ?? 0),
      created_by: user.id,
      assigned_teacher_id: teacherId,
      is_special: true,
      status: "draft",
      approval_status: "draft"
    })
    .select("id")
    .single();

  if (isMissingSpecialExamSchema(error)) throw new Error(missingSpecialExamMessage());
  if (error) throw new Error(error.message);
  await logActivity(user, "special_exam_created", "exam", data.id, { assigned_teacher_id: teacherId });
  return data.id as string;
}
