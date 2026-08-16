"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSpecialExam } from "@/lib/services/special-exams";

export async function createSpecialExamAction(formData: FormData) {
  const user = await requireUser("special-exams:manage");
  await createSpecialExam(user, formData);
  revalidatePath("/admin/academic-control");
  revalidatePath("/special-exams");
  revalidatePath("/marks");
}
