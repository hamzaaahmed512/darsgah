"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicActionError } from "@/lib/public-error";

const reviewSchema = z.object({
  status: z.enum(["submitted", "reviewing", "resolved", "dismissed"]),
  response: z.string().trim().max(3000, "Keep the response under 3000 characters.")
}).superRefine((value, context) => {
  if ((value.status === "resolved" || value.status === "dismissed") && !value.response) {
    context.addIssue({ code: "custom", path: ["response"], message: "Add an official response before closing the complaint." });
  }
});

export async function reviewParentComplaintAction(complaintId: string, formData: FormData) {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal" && user.role !== "administrator") return { success: false, error: "Only the Principal or Administrator can review parent complaints." };
  const parsed = reviewSchema.safeParse({ status: formData.get("status"), response: formData.get("response") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid review." };
  const db = await createClient();
  const { error } = await db.from("parent_complaints").update({
    status: parsed.data.status,
    admin_response: parsed.data.response || null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString()
  }).eq("id", complaintId).eq("school_id", user.schoolId);
  if (error) return { success: false, error: publicActionError(error) };
  revalidatePath("/parent-queries");
  return { success: true };
}
