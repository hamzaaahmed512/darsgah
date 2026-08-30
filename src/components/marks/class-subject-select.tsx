"use client";

import { useRouter } from "next/navigation";
import { Field, Select } from "@/components/ui/form-field";
import { formatClassDisplayName } from "@/lib/utils";

type ClassSubjectOption = {
  class_id: string;
  subject_id: string;
  class_name: string;
  subject_name: string;
  grade_name?: string | null;
  section_name?: string | null;
};

export function ClassSubjectSelect({
  options,
  selectedClassId,
  selectedSubjectId,
  range = "all",
  basePath = "/academics/exams-setup"
}: {
  options: ClassSubjectOption[];
  selectedClassId?: string;
  selectedSubjectId?: string;
  range?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const selectedValue = selectedClassId && selectedSubjectId ? `${selectedClassId}:${selectedSubjectId}` : "";

  return (
    <Field label="Class / Subject">
      <Select
        value={selectedValue}
        onChange={(event) => {
          const [classId, subjectId] = event.target.value.split(":");
          const query = new URLSearchParams();
          query.set("classId", classId);
          query.set("subjectId", subjectId);
          if (range !== "all") query.set("range", range);
          router.push(`${basePath}?${query.toString()}`);
        }}
      >
        {options.map((option) => (
          <option key={`${option.class_id}:${option.subject_id}`} value={`${option.class_id}:${option.subject_id}`}>
            {formatClassDisplayName(option.grade_name, option.class_name, option.section_name)} - {option.subject_name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
