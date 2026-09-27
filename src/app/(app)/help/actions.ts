"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicActionError } from "@/lib/public-error";

const querySchema = z.object({ subject: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(3000), assignedRole: z.enum(["principal", "administrator"]) });

export async function submitInternalQueryAction(_: { status: string; message?: string }, formData: FormData) {
  const user = await requireUser("dashboard:view");
  if (user.role === "administrator" || user.role === "principal") return { status: "error", message: "School leadership can contact Darsgah directly." };
  const parsed = querySchema.safeParse({ subject: formData.get("subject"), message: formData.get("message"), assignedRole: formData.get("assigned_role") });
  if (!parsed.success) return { status: "error", message: "Enter a subject and query message." };
  const db = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const { count, error: countError } = await db.from("internal_support_queries").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId).eq("submitted_by", user.id).gte("created_at", `${today}T00:00:00+05:00`);
  if (countError) return { status: "error", message: "Unable to check today’s query limit." };
  if ((count ?? 0) > 0) return { status: "error", message: "You can send one query per day. Please try again tomorrow." };
  const { error } = await db.from("internal_support_queries").insert({ school_id: user.schoolId, submitted_by: user.id, assigned_role: parsed.data.assignedRole, subject: parsed.data.subject, message: parsed.data.message });
  if (error) return { status: "error", message: "Could not send your query. Please try again." };
  revalidatePath("/help");
  revalidatePath("/queries");
  return { status: "success", message: "Your query has been sent to the school leadership." };
}

export async function updateInternalQueryAction(id: string, action: "solved" | "handoff") {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator" && user.role !== "principal") throw new Error("Only school leadership can manage queries.");
  const db = await createClient();
  const update = action === "solved"
    ? { status: "solved", solved_by: user.id, solved_at: new Date().toISOString() }
    : { assigned_role: user.role === "principal" ? "administrator" : "principal", status: "open", solved_by: null, solved_at: null };
  const { error } = await db.from("internal_support_queries").update(update).eq("id", id).eq("school_id", user.schoolId);
  if (error) throw new Error(publicActionError(error));
  revalidatePath("/queries");
  revalidatePath("/help");
}

export async function addInternalQueryRemarkAction(id: string, formData: FormData) {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator" && user.role !== "principal") return { success: false, error: "Only school leadership can add remarks." };
  const parsed = z.string().trim().min(1, "Enter a remark.").max(3000, "Keep the remark under 3000 characters.").safeParse(formData.get("remark"));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid remark." };

  const db = await createClient();
  const { data: query, error: queryError } = await db.from("internal_support_queries")
    .select("id").eq("id", id).eq("school_id", user.schoolId).maybeSingle();
  if (queryError || !query) return { success: false, error: "Query not found." };

  const { error } = await db.from("internal_support_query_remarks").insert({
    query_id: id,
    school_id: user.schoolId,
    author_id: user.id,
    author_role: user.role,
    remark: parsed.data
  });
  if (error) return { success: false, error: "Could not save the remark. Please try again." };
  revalidatePath("/queries");
  revalidatePath("/help");
  return { success: true };
}

export async function updateInternalQueryRemarkAction(id: string, formData: FormData) {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator" && user.role !== "principal") return { success: false, error: "Only school leadership can edit remarks." };
  const parsed = z.string().trim().min(1, "Enter a remark.").max(3000, "Keep the remark under 3000 characters.").safeParse(formData.get("remark"));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid remark." };
  const db = await createClient();
  const { data: existing, error: lookupError } = await db.from("internal_support_query_remarks").select("id").eq("id", id).eq("school_id", user.schoolId).maybeSingle();
  if (lookupError || !existing) return { success: false, error: "Remark not found." };
  const { error } = await createAdminClient().from("internal_support_query_remarks").update({ remark: parsed.data }).eq("id", id).eq("school_id", user.schoolId);
  if (error) return { success: false, error: "Could not update the remark. Please try again." };
  revalidatePath("/queries");
  return { success: true };
}

export async function deleteInternalQueryRemarkAction(id: string) {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator" && user.role !== "principal") return { success: false, error: "Only school leadership can delete remarks." };
  const db = await createClient();
  const { data: existing, error: lookupError } = await db.from("internal_support_query_remarks").select("id").eq("id", id).eq("school_id", user.schoolId).maybeSingle();
  if (lookupError || !existing) return { success: false, error: "Remark not found." };
  const { error } = await createAdminClient().from("internal_support_query_remarks").delete().eq("id", id).eq("school_id", user.schoolId);
  if (error) return { success: false, error: "Could not delete the remark. Please try again." };
  revalidatePath("/queries");
  return { success: true };
}

export async function deleteInternalQueryAction(id: string) {
  const user = await requireUser("dashboard:view");
  if (user.role === "administrator" || user.role === "principal") return { success: false, error: "Staff queries can only be deleted by their sender." };
  const db = await createClient();
  const { data: existing, error: lookupError } = await db.from("internal_support_queries").select("id").eq("id", id).eq("school_id", user.schoolId).eq("submitted_by", user.id).maybeSingle();
  if (lookupError || !existing) return { success: false, error: "Query not found." };
  const { error } = await createAdminClient().from("internal_support_queries").delete().eq("id", id).eq("school_id", user.schoolId).eq("submitted_by", user.id);
  if (error) return { success: false, error: "Could not delete the query. Please try again." };
  revalidatePath("/queries");
  return { success: true };
}

export async function markInternalQueriesViewedAction() {
  const user = await requireUser("dashboard:view");
  if (user.role === "administrator" || user.role === "principal") return;
  const { error } = await createAdminClient().from("internal_support_queries")
    .update({ submitter_viewed_at: new Date().toISOString() })
    .eq("school_id", user.schoolId)
    .eq("submitted_by", user.id);
  if (error) throw new Error("Could not mark queries as viewed.");
}
