"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getParentPortalSession } from "@/lib/parent-portal";
import { createAdminClient } from "@/lib/supabase/admin";

const complaintSchema = z.object({
  category: z.enum(["teacher", "academic", "fees", "transport", "facilities", "safety", "administration", "other"]),
  teacherId: z.string().uuid().optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Enter a subject.").max(160, "Keep the subject under 160 characters."),
  details: z.string().trim().min(1, "Describe the issue.").max(3000, "Keep the complaint under 3000 characters.")
}).superRefine((value, context) => {
  if (value.category === "teacher" && !value.teacherId) context.addIssue({ code: "custom", path: ["teacherId"], message: "Select the teacher this complaint concerns." });
  if (value.category !== "teacher" && value.teacherId) context.addIssue({ code: "custom", path: ["teacherId"], message: "A teacher can only be selected for a teacher complaint." });
});

export type ParentComplaintState = { status: "idle" | "success" | "error"; message: string };

export async function submitParentComplaintAction(
  _: ParentComplaintState,
  formData: FormData
): Promise<ParentComplaintState> {
  const session = await getParentPortalSession();
  if (!session) return { status: "error", message: "Your session has expired. Please sign in again." };
  const parsed = complaintSchema.safeParse({
    category: formData.get("category"), teacherId: formData.get("teacher_id"),
    subject: formData.get("subject"), details: formData.get("details")
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter valid complaint details." };

  const admin = createAdminClient();
  const { data: enrollment, error: enrollmentError } = await admin.from("enrollments")
    .select("class_id,classes!inner(head_teacher_id)")
    .eq("school_id", session.schoolId).eq("student_id", session.studentId).eq("status", "active")
    .order("starts_on", { ascending: false }).limit(1).maybeSingle();
  if (enrollmentError || !enrollment) return { status: "error", message: "No active class enrollment was found for this student." };

  if (parsed.data.teacherId) {
    const classRecord: any = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
    const { data: assignment, error: assignmentError } = await admin.from("teacher_assignments").select("id")
      .eq("school_id", session.schoolId).eq("class_id", enrollment.class_id).eq("teacher_id", parsed.data.teacherId).limit(1).maybeSingle();
    if (assignmentError || (!assignment && classRecord?.head_teacher_id !== parsed.data.teacherId)) {
      return { status: "error", message: "Select a teacher assigned to this student’s class." };
    }
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const { count, error: countError } = await admin.from("parent_complaints").select("id", { count: "exact", head: true })
    .eq("school_id", session.schoolId).eq("student_id", session.studentId).gte("created_at", `${today}T00:00:00+05:00`);
  if (countError) return { status: "error", message: "Unable to check today’s complaint limit." };
  if ((count ?? 0) >= 3) return { status: "error", message: "You can submit up to three complaints per day. Please try again tomorrow." };

  const { error } = await admin.from("parent_complaints").insert({
    school_id: session.schoolId, student_id: session.studentId, class_id: enrollment.class_id,
    category: parsed.data.category, complained_teacher_id: parsed.data.teacherId || null,
    subject: parsed.data.subject, details: parsed.data.details
  });
  if (error) return { status: "error", message: "Could not submit the complaint. Please try again." };
  revalidatePath(`/parent-portal/students/${session.studentId}`);
  revalidatePath("/parent-queries");
  return { status: "success", message: "Your complaint has been sent confidentially to the Principal and Administrator." };
}
