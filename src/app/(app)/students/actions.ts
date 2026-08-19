"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { archiveStudent, createStudent, updateStudent, exportStudents, importStudentsBulk } from "@/lib/services/students";
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
  redirect(`/students/${id}`);
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
