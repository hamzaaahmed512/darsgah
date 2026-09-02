"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { configureClassMajorsAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { StudentCombinationOption } from "@/lib/student-majors";

export function ClassMajorConfiguration({ classId, options, initialAllowed }: { classId: string; options: StudentCombinationOption[]; initialAllowed: string[] }) {
  const [selected, setSelected] = useState(initialAllowed);
  const [pending, startTransition] = useTransition();
  const { pushToast } = useToast();
  const router = useRouter();

  if (!options.length) return <p className="text-sm text-muted">Academic majors are not used for this grade.</p>;

  function submit() {
    const formData = new FormData();
    formData.set("class_id", classId);
    selected.forEach((major) => formData.append("allowed_major", major));
    startTransition(async () => {
      try {
        await configureClassMajorsAction(formData);
        pushToast(selected.length === 1 ? "Single major saved and assigned to all students." : "Allowed majors saved. Students must use one of the selected majors.", "success");
        router.refresh();
      } catch (error: any) {
        pushToast(error?.message ?? "Failed to save major configuration.", "error");
      }
    });
  }

  return <div className="grid gap-4">
    <div><p className="text-sm font-semibold text-ink">Majors offered in this section</p><p className="mt-1 text-xs leading-5 text-muted">Select one for automatic assignment, or two or more to require a choice during student placement.</p></div>
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${selected.includes(option.value) ? "border-primary/40 bg-primary-soft text-primary" : "border-outline text-ink"}`}>
        <input type="checkbox" checked={selected.includes(option.value)} onChange={() => setSelected((current) => current.includes(option.value) ? current.filter((value) => value !== option.value) : [...current, option.value])} className="h-4 w-4 accent-primary" />
        {option.label}
      </label>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold text-muted">{selected.length === 0 ? "No majors configured" : selected.length === 1 ? "Single major · automatic" : `${selected.length} majors · manual selection`}</p><Button type="button" onClick={submit} disabled={pending}>{pending ? "Saving..." : "Save major setup"}</Button></div>
  </div>;
}
