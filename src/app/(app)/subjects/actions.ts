"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { assignSubjectTeacher, createSubject, setStudentElectiveEnrollment, setStudentSubjectEnrollments } from "@/lib/services/academics";
import { englishNameSchema } from "@/lib/validation/names";

export async function createSubjectAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const values = z.object({
    name: englishNameSchema("Subject name", 120),
    code: z.string().trim().max(40).optional().catch(""),
    is_elective: z.boolean()
  }).parse({
    name: formData.get("name"),
    code: formData.get("code") ?? "",
    is_elective: formData.get("is_elective") === "true"
  });
  await createSubject(user, {
    name: values.name,
    code: values.code,
    is_elective: values.is_elective
  });
  revalidatePath("/subjects");
}
export async function assignSubjectTeacherAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await assignSubjectTeacher(user, { classId: String(formData.get("class_id")), subjectId: String(formData.get("subject_id")), teacherId: String(formData.get("teacher_id")) });
  revalidatePath("/subjects"); revalidatePath("/marks");
}
export async function setStudentSubjectEnrollmentsAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await setStudentSubjectEnrollments(user, { classId: String(formData.get("class_id")), subjectId: String(formData.get("subject_id")), studentIds: formData.getAll("student_id").map(String) });
  revalidatePath("/subjects"); revalidatePath("/marks"); revalidatePath("/results");
}

export async function setStudentElectiveEnrollmentAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await setStudentElectiveEnrollment(user, {
    classId: String(formData.get("class_id")),
    studentId: String(formData.get("student_id")),
    subjectId: String(formData.get("subject_id") ?? "") || null,
    electiveGroupSubjectIds: formData.getAll("elective_group_subject_id").map(String)
  });
  revalidatePath("/subjects");
  revalidatePath("/marks");
  revalidatePath("/results");
}

export async function checkSubjectDeletionAction(subjectId: string) {
  const user = await requireUser("classes:manage");
  // We need to import checkSubjectInCombinations from academics
  const { checkSubjectInCombinations } = await import("@/lib/services/academics");
  return await checkSubjectInCombinations(user, subjectId);
}

export async function deleteSubjectAction(subjectId: string) {
  const user = await requireUser("classes:manage");
  // We need to import deleteSubject from academics
  const { deleteSubject } = await import("@/lib/services/academics");
  await deleteSubject(user, subjectId);
  revalidatePath("/subjects");
  revalidatePath("/classes");
}
