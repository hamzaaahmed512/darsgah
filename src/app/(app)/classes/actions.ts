"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClass, updateClass, deleteClass, addClassSubject, assignTeacherWithSubjects, removeClassSubject, getClassStudentRoster, createSectionClass, linkExistingClassSubject } from "@/lib/services/academics";
import { assignTeacherToClass, unassignTeacherFromClass } from "@/lib/services/teachers";
import { z } from "zod";
import { setStudentMajor } from "@/lib/services/students";
import { createStudentSubjectCombination, updateStudentSubjectCombination, deleteStudentSubjectCombination, updateDefaultStudentSubjectCombination } from "@/lib/services/student-combinations";


const classSchema = z.object({
  name: z.string().min(1, "Name is required"),
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

export async function removeClassSubjectAction(classSubjectId: string) {
  const user = await requireUser("classes:manage");
  await removeClassSubject(user, classSubjectId);
  revalidatePath("/classes");
  revalidatePath("/subjects");
}

export async function getClassStudentRosterAction(classId: string) {
  const user = await requireUser("classes:manage");
  return getClassStudentRoster(user, classId);
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
  const name = z.string().min(1, "Name is required").parse(formData.get("name"));
  const sort_order = parseInt(formData.get("sort_order") as string || "10", 10);
  
  const data = await createGrade(user, { name, sort_order });
  revalidatePath("/classes");
  revalidatePath("/academics");
  return data;
}

export async function createSectionAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const name = z.string().min(1, "Name is required").parse(formData.get("name"));
  
  const data = await createSection(user, { name });
  revalidatePath("/classes");
  revalidatePath("/academics");
  return data;
}

export async function createSectionClassAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await createSectionClass(user, {
    gradeId: z.string().uuid().parse(formData.get("grade_id")),
    gradeName: z.string().min(1).parse(formData.get("grade_name")),
    sectionName: z.string().min(1, "Section name is required").parse(formData.get("section_name")),
    room: String(formData.get("room") ?? "") || null
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
