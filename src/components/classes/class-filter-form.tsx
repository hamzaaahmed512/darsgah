"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Building2, GraduationCap, Search } from "lucide-react";
import { formatGradeSection } from "@/lib/utils";
import { Select } from "@/components/ui/form-field";

type Props = {
  grades: { id: string; name: string }[];
  classes: { id: string; name: string; grade_id: string; grade_name: string; section_name: string | null }[];
};

export function ClassFilterForm({ grades, classes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushFilters = useCallback(
    (gradeId: string, q: string, classId: string) => {
      const params = new URLSearchParams();
      if (gradeId && gradeId !== "all") params.set("grade", gradeId);
      if (q) params.set("q", q);
      if (classId && classId !== "all") params.set("classId", classId);
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    },
    [pathname, router]
  );

  const currentGrade = searchParams.get("grade") ?? "all";
  const currentQ = searchParams.get("q") ?? "";
  const currentClass = searchParams.get("classId") ?? "all";
  const sectionOptions = currentGrade === "all"
    ? classes
    : classes.filter((cls) => cls.grade_id === currentGrade);
  const selectedClass = sectionOptions.some((cls) => cls.id === currentClass) ? currentClass : "all";

  function handleGradeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // A section belongs to one grade, so clear it whenever the grade changes.
    pushFilters(e.target.value, searchRef.current?.value ?? currentQ, "all");
  }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    pushFilters(currentGrade, searchRef.current?.value ?? currentQ, e.target.value);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = e.target.value;
    debounceRef.current = setTimeout(() => {
      pushFilters(currentGrade, q, selectedClass);
    }, 350);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          name="q"
          defaultValue={currentQ}
          onChange={handleSearchChange}
          className="h-14 w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 pl-12 text-sm font-medium shadow-none placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
          placeholder="Search classes by name, section, room..."
        />
      </div>
      <div className="relative">
        <GraduationCap className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
        <Select aria-label="Grade" name="grade" value={currentGrade} onChange={handleGradeChange} className="h-14 appearance-none rounded-2xl border-outline/65 bg-white pl-12 pr-10 text-sm font-medium shadow-none">
          <option value="all">Select grade (all)</option>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
        <Select aria-label="Section" name="classId" value={selectedClass} onChange={handleClassChange} className="h-14 appearance-none rounded-2xl border-outline/65 bg-white pl-12 pr-10 text-sm font-medium shadow-none">
          <option value="all">Select section (all)</option>
          {sectionOptions.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {formatGradeSection(cls.grade_name, cls.section_name ?? cls.name)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
