"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search } from "lucide-react";
import { formatClassDisplayName } from "@/lib/utils";
import { Select } from "@/components/ui/form-field";

type Props = {
  grades: { id: string; name: string }[];
  classes: { id: string; name: string; grade_name: string; section_name: string | null }[];
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

  function handleGradeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    pushFilters(e.target.value, searchRef.current?.value ?? currentQ, currentClass);
  }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    pushFilters(currentGrade, searchRef.current?.value ?? currentQ, e.target.value);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = e.target.value;
    debounceRef.current = setTimeout(() => {
      pushFilters(currentGrade, q, currentClass);
    }, 350);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          name="q"
          defaultValue={currentQ}
          onChange={handleSearchChange}
          className="pl-9 w-full rounded-lg border border-outline/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Search classes by name, section, room..."
        />
      </div>
      <Select name="grade" defaultValue={currentGrade} onChange={handleGradeChange}>
        <option value="all">All Grades</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </Select>
      <Select name="classId" defaultValue={currentClass} onChange={handleClassChange}>
        <option value="all">All Classes</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {formatClassDisplayName(cls.grade_name, cls.name, cls.section_name)}
          </option>
        ))}
      </Select>
    </div>
  );
}
