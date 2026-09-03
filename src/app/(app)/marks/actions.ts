"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createExam, saveMarks, submitExamForApproval } from "@/lib/services/marks";

export async function createExamAction(formData: FormData) {
  try {
    const user = await requireUser("academics:view");
    const assessmentCategory = String(formData.get("assessment_category") ?? "general");

    let payload: Record<string, unknown>;

    if (assessmentCategory === "examination") {
    const examType = String(formData.get("exam_type") ?? "");
    // Month is only collected from the UI when exam_type is "monthly"
    const rawMonth = formData.get("month");
    const month = examType === "monthly" && rawMonth ? Number(rawMonth) : null;
    // Examination: user selects exam_type; title is auto-derived by the schema transform
    payload = {
      assessment_category: "examination",
      class_id: String(formData.get("class_id") ?? ""),
      subject_id: String(formData.get("subject_id") ?? ""),
      exam_type: examType,
      title: "", // auto-derived by examSchema transform
      term: "",
      month,
      exam_date: String(formData.get("exam_date") ?? ""),
      max_marks: Number(formData.get("max_marks") ?? 0)
    };
    } else {
    // General Assessment: user provides a free-form title; exam_type fixed to "quiz"
    payload = {
      assessment_category: "general",
      class_id: String(formData.get("class_id") ?? ""),
      subject_id: String(formData.get("subject_id") ?? ""),
      exam_type: "quiz",
      title: String(formData.get("title") ?? ""),
      term: "",
      month: null,
      exam_date: String(formData.get("exam_date") ?? ""),
      max_marks: Number(formData.get("max_marks") ?? 0)
    };
    }

    await createExam(user, payload as any);

    revalidatePath("/marks");
    revalidatePath("/academics/exams-setup");
    revalidatePath("/admin/academic-control");
    revalidatePath("/results");
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Assessment could not be created." };
  }
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
