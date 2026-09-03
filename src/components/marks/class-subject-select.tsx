"use client";

import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";
import { Select } from "@/components/ui/form-field";
import { formatClassDisplayName } from "@/lib/utils";
import { useMemo } from "react";

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
  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.class_id)) return false;
      seen.add(option.class_id);
      return true;
    });
  }, [options]);

  const activeClassId = selectedClassId ?? classOptions[0]?.class_id ?? "";
  const subjectOptions = useMemo(
    () => options.filter((option) => option.class_id === activeClassId),
    [options, activeClassId]
  );
  const activeSubjectId = subjectOptions.some((option) => option.subject_id === selectedSubjectId)
    ? selectedSubjectId ?? ""
    : subjectOptions[0]?.subject_id ?? "";

  function pushFilters(classId: string, subjectId: string) {
    const query = new URLSearchParams();
    query.set("classId", classId);
    query.set("subjectId", subjectId);
    if (range !== "all") query.set("range", range);
    router.push(`${basePath}?${query.toString()}`);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink">Class</span>
        <div className="relative">
          <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
          <Select
            value={activeClassId}
            onChange={(event) => {
              const nextClassId = event.target.value;
              const nextSubjectId = options.find((option) => option.class_id === nextClassId)?.subject_id ?? "";
              if (nextSubjectId) pushFilters(nextClassId, nextSubjectId);
            }}
            className="h-11 appearance-none rounded-2xl border-outline/70 bg-white pl-11 pr-10 text-sm font-medium shadow-none"
          >
            {classOptions.map((option) => (
              <option key={option.class_id} value={option.class_id}>
                {formatClassDisplayName(option.grade_name, option.class_name, option.section_name)}
              </option>
            ))}
          </Select>
        </div>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink">Subject</span>
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
          <Select
            value={activeSubjectId}
            onChange={(event) => {
              if (activeClassId) pushFilters(activeClassId, event.target.value);
            }}
            className="h-11 appearance-none rounded-2xl border-outline/70 bg-white pl-11 pr-10 text-sm font-medium shadow-none"
          >
            {subjectOptions.map((option) => (
              <option key={`${option.class_id}:${option.subject_id}`} value={option.subject_id}>
                {option.subject_name}
              </option>
            ))}
          </Select>
        </div>
      </label>
    </div>
  );
}
