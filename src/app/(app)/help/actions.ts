"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({ subject: z.string().trim().min(3).max(160), message: z.string().trim().min(10).max(3000), assignedRole: z.enum(["principal", "administrator"]) });

export async function submitInternalQueryAction(_: { status: string; message?: string }, formData: FormData) {
  const user = await requireUser("dashboard:view");
  if (user.role === "administrator" || user.role === "principal") return { status: "error", message: "School leadership can contact Darsgah directly." };
  const parsed = querySchema.safeParse({ subject: formData.get("subject"), message: formData.get("message"), assignedRole: formData.get("assigned_role") });
  if (!parsed.success) return { status: "error", message: "Add a clear subject and message (at least 10 characters)." };
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
  if (error) throw new Error(error.message);
  revalidatePath("/queries");
}
