"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { reviewRequest } from "@/lib/services/approvals";
import { reviewRequestSchema } from "@/lib/validation/approvals";

export async function reviewRequestAction(requestId: string, formData: FormData) {
  const user = await requireUser("approvals:review");
  const decision = formData.get("decision") as "approved" | "denied";
  const reason = formData.get("denial_reason") as string | null;

  const parsed = reviewRequestSchema.safeParse({
    decision,
    denial_reason: reason
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  try {
    await reviewRequest(user, requestId, parsed.data.decision, parsed.data.denial_reason || undefined);
    revalidatePath("/approvals");
    revalidatePath("/students");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to process request" };
  }
}
