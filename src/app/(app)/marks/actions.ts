"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createExam, saveMarks, submitExamForApproval } from "@/lib/services/marks";

function getAssessmentRedirectBase(referer: string | null) {
  if (!referer) return "/academics/exams-setup";
  try {
    return new URL(referer).pathname.startsWith("/admin/academic-control") ? "/admin/academic-control" : "/academics/exams-setup";
  } catch {
    return "/academics/exams-setup";
  }
}

export async function createExamAction(formData: FormData) {
  const user = await requireUser("academics:view");
  await createExam(user, {
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
  revalidatePath("/academics/exams-setup");
  revalidatePath("/admin/academic-control");
  revalidatePath("/results");
  const headerStore = await headers();
  const redirectBase = getAssessmentRedirectBase(headerStore.get("referer"));
  redirect(`${redirectBase}?classId=${formData.get("class_id")}&subjectId=${formData.get("subject_id")}`);
}

export async function saveMarksAction(formData: FormData) {
  const user = await requireUser("academics:view");
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
  revalidatePath("/academics/exams-setup");
  revalidatePath("/admin/academic-control");
  revalidatePath("/results");
}

export async function submitExamForApprovalAction(formData: FormData) {
  const user = await requireUser("academics:view");
  await submitExamForApproval(user, String(formData.get("exam_id") ?? ""));
  revalidatePath("/marks");
  revalidatePath("/academics/exams-setup");
  revalidatePath("/admin/academic-control");
  revalidatePath("/results");
}
