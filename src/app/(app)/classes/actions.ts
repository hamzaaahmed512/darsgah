"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClass, updateClass, deleteClass, addClassSubject, addGradeSubject, assignTeacherWithSubjects, removeClassSubject, removeGradeSubject, getClassStudentRoster, createSectionClass, linkExistingClassSubject, configureClassMajors } from "@/lib/services/academics";
import { assignTeacherToClass, unassignTeacherFromClass } from "@/lib/services/teachers";
import { z } from "zod";
import { setStudentMajor } from "@/lib/services/students";
import { createStudentSubjectCombination, updateStudentSubjectCombination, deleteStudentSubjectCombination, deleteDefaultStudentSubjectCombination, updateDefaultStudentSubjectCombination } from "@/lib/services/student-combinations";
import { classNameSchema, englishNameSchema } from "@/lib/validation/names";
import { createClient } from "@/lib/supabase/server";
import { publicActionError } from "@/lib/public-error";


const classSchema = z.object({
  name: classNameSchema("Class name", 120),
  grade_id: z.string().uuid("Grade is required"),
  section_id: z.string().uuid().optional().or(z.literal("")),
  academic_year_id: z.string().uuid("Academic year is required"),
  room: z.string().optional(),
  head_teacher_id: z.string().uuid().optional().or(z.literal(""))
});

export async function createClassAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const data = classSchema.parse({
    name: formData.get("name"),
    grade_id: formData.get("grade_id"),
    section_id: formData.get("section_id") || undefined,
    academic_year_id: formData.get("academic_year_id"),
    room: formData.get("room") || undefined,
    head_teacher_id: formData.get("head_teacher_id")
  });

  await createClass(user, { ...data, section_id: data.section_id || null, head_teacher_id: data.head_teacher_id || null });
  revalidatePath("/classes");
  revalidatePath("/academics");
}

export async function updateClassAction(classId: string, formData: FormData) {
  const user = await requireUser("classes:manage");
  const data = classSchema.parse({
    name: formData.get("name"),
    grade_id: formData.get("grade_id"),
    section_id: formData.get("section_id") || undefined,
    academic_year_id: formData.get("academic_year_id"),
    room: formData.get("room") || undefined,
    head_teacher_id: formData.get("head_teacher_id")
  });

  await updateClass(user, classId, { ...data, section_id: data.section_id || null, head_teacher_id: data.head_teacher_id || null });
  revalidatePath("/classes");
  revalidatePath("/academics");
}

export async function assignTeacherClassAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const teacherId = formData.get("teacher_id") as string;
  const classId = formData.get("class_id") as string;
  const subjectIds = formData.getAll("subject_id").map(String).filter(Boolean);
  const subjectId = formData.get("subject_id") as string | undefined;

  if (subjectIds.length) {
    await assignTeacherWithSubjects(user, { classId, teacherId, subjectIds });
  } else {
    await assignTeacherToClass(user, teacherId, classId, subjectId || undefined);
  }

  revalidatePath("/classes");
  revalidatePath("/teachers");
}

export async function addClassSubjectAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const classId = String(formData.get("class_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const isClassSpecific = formData.get("is_class_specific") === "true";
  const isElective = formData.get("is_elective") === "true";

  await addClassSubject(user, { classId, name, isClassSpecific, isElective });
  revalidatePath("/classes");
  revalidatePath("/subjects");
}

export async function linkExistingClassSubjectAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await linkExistingClassSubject(user, {
    classId: z.string().uuid().parse(formData.get("class_id")),
    subjectId: z.string().uuid().parse(formData.get("subject_id"))
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
}

export async function addGradeSubjectAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await addGradeSubject(user, {
    gradeId: z.string().uuid().parse(formData.get("grade_id")),
    subjectId: formData.get("subject_id") ? z.string().uuid().parse(formData.get("subject_id")) : undefined,
    name: formData.get("name") ? z.string().trim().min(1).max(120).parse(formData.get("name")) : undefined
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
}

export async function removeClassSubjectAction(classSubjectId: string) {
  const user = await requireUser("classes:manage");
  await removeClassSubject(user, classSubjectId);
  revalidatePath("/classes");
  revalidatePath("/subjects");
}

export async function removeGradeSubjectAction(gradeId: string, subjectId: string) {
  const user = await requireUser("classes:manage");
  await removeGradeSubject(user, { gradeId: z.string().uuid().parse(gradeId), subjectId: z.string().uuid().parse(subjectId) });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function getClassStudentRosterAction(classId: string) {
  const user = await requireUser("classes:manage");
  return getClassStudentRoster(user, classId);
}

export async function getPromotionRosterAction(classIds: string[]) {
  const user = await requireUser("classes:manage");
  const parsedClassIds = z.array(z.string().uuid()).min(1).parse(classIds);
  const supabase = await createClient();
  const [{ data, error }, { data: selectedClasses, error: classError }, { data: grades, error: gradeError }] = await Promise.all([
    supabase.from("enrollments").select("student_id,class_id,students(first_name,last_name,admission_number)").eq("school_id", user.schoolId).in("class_id", parsedClassIds).eq("status", "active"),
    supabase.from("classes").select("id,grade_id,academic_year_id,grades(sort_order)").eq("school_id", user.schoolId).in("id", parsedClassIds),
    supabase.from("grades").select("sort_order").eq("school_id", user.schoolId).order("sort_order", { ascending: false }).limit(1)
  ]);
  if (error) throw new Error(publicActionError(error));
  if (classError) throw new Error(publicActionError(classError));
  if (gradeError) throw new Error(publicActionError(gradeError));
  if ((selectedClasses ?? []).length !== new Set(parsedClassIds).size) throw new Error("One or more selected classes were not found.");
  const academicYearIds = new Set((selectedClasses ?? []).map((item: any) => item.academic_year_id));
  const gradeOrders = new Set((selectedClasses ?? []).map((item: any) => item.grades?.sort_order));
  if (academicYearIds.size !== 1 || gradeOrders.size !== 1) throw new Error("Promote classes from one grade and academic year at a time.");
  const highestGradeOrder = grades?.[0]?.sort_order;
  const selectedGradeOrder = (selectedClasses?.[0] as any)?.grades?.sort_order;
  return {
    students: (data ?? []).map((row: any) => ({ id: row.student_id, classId: row.class_id, name: `${row.students?.first_name ?? ""} ${row.students?.last_name ?? ""}`.trim(), admissionNumber: row.students?.admission_number ?? null })),
    isTerminalGrade: highestGradeOrder !== undefined && selectedGradeOrder === highestGradeOrder
  };
}

export async function promoteStudentsAction(classIds: string[], promotedStudentIds: string[], retainedStudentIds: string[], graduateStudentIds: string[] = []) {
  const user = await requireUser("classes:manage");
  const ids = z.array(z.string().uuid());
  const parsedClassIds = ids.min(1).parse(classIds);
  const promoted = ids.parse(promotedStudentIds);
  const retained = ids.parse(retainedStudentIds);
  const graduated = ids.parse(graduateStudentIds);
  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_class_students", { p_school_id: user.schoolId, p_class_ids: parsedClassIds, p_promoted_student_ids: promoted, p_retained_student_ids: retained, p_graduate_student_ids: graduated });
  if (error) throw new Error(publicActionError(error));
  revalidatePath("/classes"); revalidatePath("/students"); revalidatePath("/dashboard");
}

export async function unassignTeacherClassAction(assignmentId: string) {
  const user = await requireUser("classes:manage");
  await unassignTeacherFromClass(user, assignmentId);
  revalidatePath("/classes");
  revalidatePath("/teachers");
}

export async function deleteClassAction(classId: string) {
  const user = await requireUser("classes:manage");
  await deleteClass(user, classId);
  revalidatePath("/classes");
  revalidatePath("/academics");
}

import { createGrade, createSection } from "@/lib/services/academics";
import { createAcademicYear } from "@/lib/services/settings";

export async function createGradeAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const name = englishNameSchema("Grade name", 80).parse(formData.get("name"));
  const sort_order = parseInt(formData.get("sort_order") as string || "10", 10);
  
  const data = await createGrade(user, { name, sort_order });
  revalidatePath("/classes");
  revalidatePath("/academics");
  return data;
}

export async function deleteGradeAction(gradeId: string) {
  const user = await requireUser("classes:manage");
  const parsedGradeId = z.string().uuid().parse(gradeId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_grade_with_classes", {
    p_school_id: user.schoolId,
    p_grade_id: parsedGradeId
  });
  if (error) throw new Error(publicActionError(error));
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/academics");
  revalidatePath("/dashboard");
  return { deletedSections: Number(data ?? 0) };
}

export async function createSectionAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const name = englishNameSchema("Section name", 80).parse(formData.get("name"));
  
  const data = await createSection(user, { name });
  revalidatePath("/classes");
  revalidatePath("/academics");
  return data;
}

export async function createSectionClassAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await createSectionClass(user, {
    gradeId: z.string().uuid().parse(formData.get("grade_id")),
    gradeName: englishNameSchema("Grade name", 80).parse(formData.get("grade_name")),
    sectionName: englishNameSchema("Section name", 80).parse(formData.get("section_name")),
    room: String(formData.get("room") ?? "") || null,
    allowedMajors: formData.getAll("allowed_major").map(String).filter(Boolean)
  });
  revalidatePath("/classes");
}

export async function setStudentMajorAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const rawMajor = String(formData.get("major") ?? "");
  const major = rawMajor ? z.string().trim().min(1).max(120).parse(rawMajor) : null;
  await setStudentMajor(user, {
    studentId: z.string().uuid().parse(formData.get("student_id")),
    classId: z.string().uuid().parse(formData.get("class_id")),
    major
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
}

export async function configureClassMajorsAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const classId = z.string().uuid().parse(formData.get("class_id"));
  const allowedMajors = formData.getAll("allowed_major").map(String).filter(Boolean);
  await configureClassMajors(user, classId, allowedMajors);
  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/students");
}

export async function createStudentSubjectCombinationAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await createStudentSubjectCombination(user, {
    name: z.string().trim().min(1, "Combination name is required.").max(120).parse(formData.get("name")),
    classIds: formData.getAll("class_id").map(String).filter(Boolean),
    subjectIds: formData.getAll("subject_id").map(String).filter(Boolean)
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function updateStudentSubjectCombinationAction(combinationId: string, formData: FormData) {
  const user = await requireUser("classes:manage");
  await updateStudentSubjectCombination(user, z.string().uuid().parse(combinationId), {
    name: z.string().trim().min(1, "Combination name is required.").max(120).parse(formData.get("name")),
    classIds: formData.getAll("class_id").map(String).filter(Boolean),
    subjectIds: formData.getAll("subject_id").map(String).filter(Boolean)
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function updateDefaultStudentSubjectCombinationAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await updateDefaultStudentSubjectCombination(user, {
    combinationKey: z.string().trim().min(1).max(120).parse(formData.get("combination_key")),
    gradeId: z.string().uuid().parse(formData.get("grade_id")),
    name: z.string().trim().min(1, "Combination name is required.").max(120).parse(formData.get("name")),
    subjectIds: formData.getAll("subject_id").map(String).filter(Boolean)
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function deleteStudentSubjectCombinationAction(combinationId: string) {
  const user = await requireUser("classes:manage");
  await deleteStudentSubjectCombination(user, z.string().uuid().parse(combinationId));
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/students");
}

export async function deleteDefaultStudentSubjectCombinationAction(combinationKey: string, gradeId: string) {
  const user = await requireUser("classes:manage");
  await deleteDefaultStudentSubjectCombination(user, {
    combinationKey: z.string().trim().min(1).max(120).parse(combinationKey),
    gradeId: z.string().uuid().parse(gradeId)
  });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/students");
}


export async function createAcademicYearAction(formData: FormData) {
  const user = await requireUser("settings:manage");
  const name = z.string().min(1, "Name is required").parse(formData.get("name"));
  const starts_on = z.string().parse(formData.get("starts_on"));
  const ends_on = z.string().parse(formData.get("ends_on"));
  const is_active = formData.get("is_active") === "true";
  
  const data = await createAcademicYear(user, { name, starts_on, ends_on, is_active });
  revalidatePath("/classes");
  revalidatePath("/academics");
  return data;
}
