"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudentMajorAction } from "@/app/(app)/classes/actions";
import { Select } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { majorsForGrade, STUDENT_MAJOR_LABELS, type StudentMajor } from "@/lib/student-majors";

export function StudentMajorSelect({ studentId, classId, gradeName, currentMajor }: {
  studentId: string;
  classId: string;
  gradeName: string;
  currentMajor: StudentMajor | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const options = majorsForGrade(gradeName);
  const [value, setValue] = useState(currentMajor ?? "");
  const [pending, startTransition] = useTransition();
  if (!options.length) return null;

  function change(nextValue: string) {
    const previous = value;
    setValue(nextValue as StudentMajor | "");
    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("class_id", classId);
    formData.set("major", nextValue);
    startTransition(async () => {
      try {
        await setStudentMajorAction(formData);
        pushToast("Student major updated.", "success");
        router.refresh();
      } catch (error: any) {
        setValue(previous);
        pushToast(error?.message ?? "Failed to update major.", "error");
      }
    });
  }

  return <Select value={value} onChange={(event) => change(event.target.value)} disabled={pending} className="h-9 min-w-52 text-xs">
    <option value="">Select major...</option>
    {options.map((major) => <option key={major} value={major}>{STUDENT_MAJOR_LABELS[major]}</option>)}
  </Select>;
}
