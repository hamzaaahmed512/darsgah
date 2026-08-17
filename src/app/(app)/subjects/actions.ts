"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { assignSubjectTeacher, createSubject, setStudentSubjectEnrollments } from "@/lib/services/academics";

export async function createSubjectAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  await createSubject(user, { name: String(formData.get("name") ?? ""), code: String(formData.get("code") ?? "") });
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
