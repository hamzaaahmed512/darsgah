import { PageHeader } from "@/components/layout/page-header";
import { StudentForm } from "@/components/students/student-form";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions } from "@/lib/services/academics";
import { getSubjectCombinationCatalog } from "@/lib/services/student-combinations";
import { createStudentAction } from "@/app/(app)/students/actions";

export default async function NewStudentPage() {
  const user = await requireUser("students:create");
  const [academics, combinations] = await Promise.all([
    getAcademicOptions(user),
    getSubjectCombinationCatalog(user).catch(() => ({ customCombinations: [] }))
  ]);

  return (
    <>
      <PageHeader 
        eyebrow="Admissions" 
        title="Add Student" 
        description={user.role === "student_staff" ? "Submit a new student admission request for Principal approval." : "Create a validated student record and optional active class enrollment."} 
      />
      <StudentForm
        classes={academics.classes}
        combinations={combinations.customCombinations.map((combination) => ({
          value: combination.value,
          label: combination.name,
          kind: "custom",
          classIds: combination.classIds,
          subjectIds: combination.subjectIds
        }))}
        onSubmit={createStudentAction}
        submitLabel={user.role === "student_staff" ? "Submit request" : "Add student"}
      />
    </>
  );
}
