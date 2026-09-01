"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudentMajorAction } from "@/app/(app)/classes/actions";
import { Select } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { canSelectStudentCombination, defaultCombinationOptionsForGrade, normalizeStudentMajorValue, type StudentCombinationOption } from "@/lib/student-majors";

export function StudentMajorSelect({ studentId, classId, gradeName, currentMajor, options: providedOptions }: {
  studentId: string;
  classId: string;
  gradeName: string;
  currentMajor: string | null;
  options?: StudentCombinationOption[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const canSelectCombination = canSelectStudentCombination(gradeName);
  const options = canSelectCombination ? (providedOptions?.length ? providedOptions : defaultCombinationOptionsForGrade(gradeName)) : [];
  const [value, setValue] = useState(normalizeStudentMajorValue(currentMajor) ?? currentMajor ?? "");
  const [pending, startTransition] = useTransition();
  if (!options.length) return null;

  function change(nextValue: string) {
    const previous = value;
    setValue(nextValue);
    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("class_id", classId);
    formData.set("major", nextValue);
    startTransition(async () => {
      try {
        await setStudentMajorAction(formData);
        pushToast("Student combination updated.", "success");
        router.refresh();
      } catch (error: any) {
        setValue(previous);
        pushToast(error?.message ?? "Failed to update combination.", "error");
      }
    });
  }

  return <Select value={value} onChange={(event) => change(event.target.value)} disabled={pending} className="h-9 min-w-52 text-xs">
    <option value="">Select combination...</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </Select>;
}
