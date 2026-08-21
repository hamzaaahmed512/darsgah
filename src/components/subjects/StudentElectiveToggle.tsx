"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setStudentElectiveEnrollmentAction } from "@/app/(app)/subjects/actions";
import { useToast } from "@/components/ui/toast";

type ElectiveOption = { id: string; name: string };

export function StudentElectiveToggle({
  classId,
  studentId,
  electiveOptions,
  currentSubjectId
}: {
  classId: string;
  studentId: string;
  electiveOptions: ElectiveOption[];
  currentSubjectId: string | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleChange(subjectId: string) {
    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("student_id", studentId);
    if (subjectId) formData.append("subject_id", subjectId);
    electiveOptions.forEach((option) => formData.append("elective_group_subject_id", option.id));

    startTransition(async () => {
      try {
        await setStudentElectiveEnrollmentAction(formData);
        const selected = electiveOptions.find((option) => option.id === subjectId);
        pushToast(selected ? `Enrolled in ${selected.name}.` : "Elective cleared.", "success");
        router.refresh();
      } catch (err: any) {
        pushToast(err?.message ?? "Failed to update elective.", "error");
      }
    });
  }

  return (
    <select
      value={currentSubjectId ?? ""}
      disabled={pending}
      onChange={(event) => handleChange(event.target.value)}
      className="h-9 min-w-[140px] rounded-full border border-outline/60 bg-white px-3 text-xs font-semibold text-ink"
      aria-label="Select elective subject"
    >
      <option value="">Unassigned</option>
      {electiveOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
