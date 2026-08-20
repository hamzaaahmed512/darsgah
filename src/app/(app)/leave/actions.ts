"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth/session";
import { reviewLeaveRequest, submitLeaveRequest } from "@/lib/services/leaves";

function isMigrationRequiredError(error: unknown) {
  return error instanceof Error && error.message.includes("latest School OS database migration");
}

export async function submitLeaveAction(formData: FormData) {
  const user = await requireUser("leave:view");
  try {
    await submitLeaveRequest(user, {
      leave_type: formData.get("leave_type") as any,
      start_date: String(formData.get("start_date") ?? ""),
      end_date: String(formData.get("end_date") ?? ""),
      reason: String(formData.get("reason") ?? "")
    });
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/leave");
    throw error;
  }
  revalidatePath("/leave");
  revalidatePath("/approvals");
  redirect("/leave");
}

export async function reviewLeaveAction(formData: FormData) {
  const user = await requireUser("leave:manage");
  try {
    await reviewLeaveRequest(user, String(formData.get("leave_id") ?? ""), {
      decision: formData.get("decision") as any,
      principal_remarks: String(formData.get("principal_remarks") ?? "")
    });
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/approvals?tab=leaves");
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "Check the review details and try again." };
    }
    console.error("Leave review failed:", error);
    return { error: error instanceof Error ? error.message : "Leave could not be reviewed. Please try again." };
  }
  revalidatePath("/leave");
  revalidatePath("/approvals");
  return { success: true };
}
