"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { reviewExamApproval } from "@/lib/services/marks";

export async function reviewExamApprovalAction(approvalId: string, formData: FormData) {
  const user = await requireUser("marks:approve");
  const decision = formData.get("decision");
  if (decision !== "approved" && decision !== "returned") throw new Error("Choose approve or return to teacher.");

  await reviewExamApproval(user, approvalId, decision, String(formData.get("principal_comment") ?? ""));
  revalidatePath("/admin/academic-control");
  revalidatePath("/results");
  revalidatePath("/exam-approvals");
}
