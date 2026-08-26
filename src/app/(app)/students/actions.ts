"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { archiveStudent, createStudent, updateStudent, exportStudents, importStudentsBulk } from "@/lib/services/students";
import { reviewRequest } from "@/lib/services/approvals";
import { reviewRequestSchema } from "@/lib/validation/approvals";
import type { StudentFilters } from "@/lib/services/students";
import type { StudentFormValues } from "@/lib/validation/students";

export async function createStudentAction(values: StudentFormValues) {
  let id: string;
  try {
    const user = await requireUser("students:create");
    id = await createStudent(user, values);
  } catch (error: any) {
    return { error: error.message || "Failed to create student." };
  }
  revalidatePath("/students");
  return { ok: true, id };
}

export async function updateStudentAction(id: string, values: StudentFormValues) {
  try {
    const user = await requireUser("students:update");
    await updateStudent(user, id, values);
  } catch (error: any) {
    return { error: error.message || "Failed to update student." };
  }
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function archiveStudentAction(id: string) {
  const user = await requireUser("students:archive");
  await archiveStudent(user, id);
  revalidatePath("/students");
  redirect("/students?status=archived");
}

export async function exportStudentsAction(filters: StudentFilters) {
  try {
    const user = await requireUser("students:view");
    const csvData = await exportStudents(user, filters);
    return { ok: true, data: csvData };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function importStudentsAction(records: any[]) {
  try {
    const user = await requireUser("students:create");
    if (!records || records.length === 0) return { error: "No records provided" };
    
    const count = await importStudentsBulk(user, records);
    revalidatePath("/students");
    return { ok: true, count };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function reviewStudentRequestAction(requestId: string, formData: FormData) {
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
    revalidatePath("/students");
    revalidatePath("/dashboard/principal");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to process request" };
  }
}
