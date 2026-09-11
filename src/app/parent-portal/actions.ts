"use server";

import { z } from "zod";
import { getParentPortalSession } from "@/lib/parent-portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPakistaniPhoneForStorage, isValidPakistaniPhone } from "@/lib/pakistan-format";

const detailsSchema = z.object({
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional().nullable().or(z.literal("")),
  address: z.string().trim().max(500, "Address is too long.").optional().nullable()
});

export async function completeStudentPortalDetails(values: { phone?: string; email?: string; address?: string }) {
  const session = await getParentPortalSession();
  if (!session) return { error: "Your session has expired. Please sign in again." };
  const parsed = detailsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter valid details." };

  const admin = createAdminClient();
  const { data: student, error: readError } = await admin
    .from("students")
    .select("phone,email,address")
    .eq("id", session.studentId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (readError || !student) return { error: "Student record was not found." };

  const update: Record<string, string> = {};
  if (!student.phone && parsed.data.phone?.trim()) {
    if (!isValidPakistaniPhone(parsed.data.phone)) return { error: "Phone number must be 11 digits, like 0300-0000000." };
    update.phone = formatPakistaniPhoneForStorage(parsed.data.phone) ?? "";
  }
  if (!student.email && parsed.data.email?.trim()) update.email = parsed.data.email.trim();
  if (!student.address && parsed.data.address?.trim()) update.address = parsed.data.address.trim();
  if (!Object.keys(update).length) return { error: "There are no missing contact details to add." };

  const { error: updateError } = await admin.from("students").update(update).eq("id", session.studentId).eq("school_id", session.schoolId);
  if (updateError) return { error: "Could not save the details. Please try again." };
  return { success: true as const };
}
