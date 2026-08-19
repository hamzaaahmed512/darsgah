"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { archiveStudent, createStudent, updateStudent, exportStudents, importStudentsBulk } from "@/lib/services/students";
import type { StudentFilters } from "@/lib/services/students";
import type { StudentFormValues } from "@/lib/validation/students";

export async function createStudentAction(values: StudentFormValues) {
  const user = await requireUser("students:create");
  const id = await createStudent(user, values);
  revalidatePath("/students");
  redirect(`/students/${id}`);
}

export async function updateStudentAction(id: string, values: StudentFormValues) {
  const user = await requireUser("students:update");
  await updateStudent(user, id, values);
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

export async function importStudentsAction(formData: FormData) {
  try {
    const user = await requireUser("students:create");
    const file = formData.get("file") as File;
    if (!file) return { error: "No file provided" };
    
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return { error: "Empty or invalid CSV file" };
    
    const parseCSVRow = (text: string) => {
      let inQuotes = false;
      let val = "";
      const row = [];
      for(let i=0; i<text.length; i++){
        const char = text[i];
        if(char === '"' && text[i+1] === '"') { val += '"'; i++; } // Escaped quote
        else if(char === '"') inQuotes = !inQuotes;
        else if(char === ',' && !inQuotes) { row.push(val); val = ""; }
        else val += char;
      }
      row.push(val);
      return row.map(v => v.trim());
    };

    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase());
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      const record: any = {};
      
      headers.forEach((h, idx) => {
        const val = row[idx] || "";
        if (h.includes("admission no")) record.admission_number = val;
        else if (h.includes("name (en)")) record.name_en = val;
        else if (h.includes("name (ur)")) record.name_ur = val;
        else if (h.includes("father name")) record.father_name_en = val;
        else if (h.includes("father phone")) record.father_phone = val;
        else if (h.includes("gender")) record.gender = val;
        else if (h.includes("class")) record.class_name = val;
        else if (h.includes("status")) record.status = val;
        else if (h.includes("dob")) record.date_of_birth = val;
      });
      
      if (record.name_en) {
        records.push(record);
      }
    }
    
    const count = await importStudentsBulk(user, records);
    revalidatePath("/students");
    return { ok: true, count };
  } catch (err: any) {
    return { error: err.message };
  }
}
