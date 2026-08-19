import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StudentForm } from "@/components/students/student-form";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions } from "@/lib/services/academics";
import { getStudent } from "@/lib/services/students";
import { updateStudentAction } from "@/app/(app)/students/actions";
import type { StudentFormValues } from "@/lib/validation/students";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("students:update");
  const [{ student, guardians }, academics] = await Promise.all([getStudent(user, id), getAcademicOptions(user)]);
  if (!student) notFound();
  const guardian = guardians[0];

  async function submit(values: StudentFormValues) {
    "use server";
    await updateStudentAction(id, values);
  }

  return (
    <>
      <PageHeader eyebrow={student.admission_number} title="Edit Student" description="Update the profile. Role and tenant enforcement still happen on the server and in RLS." />
      <StudentForm
        classes={academics.classes}
        onSubmit={submit}
        submitLabel="Save changes"
        initialValues={{
          admission_number: student.admission_number,
          first_name: student.first_name,
          last_name: student.last_name,
          name_en: (student as any).name_en || `${student.first_name} ${student.last_name}`,
          name_ur: (student as any).name_ur || "",
          father_name_en: (student as any).father_name_en || guardian?.full_name || "",
          father_name_ur: (student as any).father_name_ur || "",
          father_phone: (student as any).father_phone || guardian?.phone || "",
          father_cnic: (student as any).father_cnic || "",
          photo_url: (student as any).photo_url || "",
          date_of_birth: student.date_of_birth,
          gender: (student.gender === "male" || student.gender === "female") ? student.gender : undefined,
          email: student.email ?? "",
          phone: student.phone ?? "",
          address: student.address ?? "",
          admission_date: student.admission_date,
          status: student.status,
          class_id: student.class_id ?? "",
          guardian_name: guardian?.full_name ?? "Guardian",
          guardian_relationship: guardian?.relationship ?? "Guardian",
          guardian_email: guardian?.email ?? "",
          guardian_phone: guardian?.phone ?? "+1 555 000 0000",
          emergency_contact_name: guardian?.emergency_contact_name ?? guardian?.full_name ?? "Emergency Contact",
          emergency_contact_phone: guardian?.emergency_contact_phone ?? guardian?.phone ?? "+1 555 000 0000"
        }}
      />
    </>
  );
}
