"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createExam, saveMarks, submitExamForApproval } from "@/lib/services/marks";

export async function createExamAction(formData: FormData) {
  const user = await requireUser("marks:manage");
  const examId = await createExam(user, {
    class_id: String(formData.get("class_id") ?? ""),
    subject_id: String(formData.get("subject_id") ?? ""),
    exam_type: formData.get("exam_type") as any,
    month: formData.get("month") ? Number(formData.get("month")) : null,
    title: String(formData.get("title") ?? ""),
    term: String(formData.get("term") ?? ""),
    exam_date: String(formData.get("exam_date") ?? ""),
    max_marks: Number(formData.get("max_marks") ?? 0)
  });

  revalidatePath("/marks");
  revalidatePath("/results");
  redirect(`/marks?classId=${formData.get("class_id")}&subjectId=${formData.get("subject_id")}&examId=${examId}`);
}

export async function saveMarksAction(formData: FormData) {
  const user = await requireUser("marks:manage");
  const examId = String(formData.get("exam_id") ?? "");
  const records = [...formData.entries()]
    .filter(([key]) => key.startsWith("mark_"))
    .map(([key, value]) => {
      const studentId = key.replace("mark_", "");
      return {
        student_id: studentId,
        marks_obtained: Number(value),
        teacher_comment: String(formData.get(`comment_${studentId}`) ?? "")
      };
    })
    .filter((record) => Number.isFinite(record.marks_obtained));

  await saveMarks(user, { exam_id: examId, records });
  revalidatePath("/marks");
  revalidatePath("/results");
}

export async function submitExamForApprovalAction(formData: FormData) {
  const user = await requireUser("marks:manage");
  await submitExamForApproval(user, String(formData.get("exam_id") ?? ""));
  revalidatePath("/marks");
  revalidatePath("/results");
}
