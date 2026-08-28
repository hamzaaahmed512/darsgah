"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createStudentSubjectCombinationAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

type ClassOption = { id: string; name: string; grade_name?: string | null; section_name?: string | null };
type SubjectOption = { id: string; name: string };

export function SubjectCombinationCreateForm({ classes, subjects }: { classes: ClassOption[]; subjects: SubjectOption[] }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function toggle(value: string, selected: string[], setSelected: (values: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function submit() {
    const formData = new FormData();
    formData.set("name", name);
    classIds.forEach((classId) => formData.append("class_id", classId));
    subjectIds.forEach((subjectId) => formData.append("subject_id", subjectId));

    startTransition(async () => {
      try {
        await createStudentSubjectCombinationAction(formData);
        pushToast("Combination created.", "success");
        setName("");
        setClassIds([]);
        setSubjectIds([]);
        router.refresh();
      } catch (error: any) {
        pushToast(error?.message ?? "Failed to create combination.", "error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-outline/50 bg-surface-low p-4">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">Create combination</h2>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Arts with Computer" />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-ink">Classes</legend>
          <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-white p-3 sm:grid-cols-2">
            {classes.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={classIds.includes(item.id)} onChange={() => toggle(item.id, classIds, setClassIds)} className="h-4 w-4 accent-primary" />
                <span>{[item.grade_name, item.name, item.section_name].filter(Boolean).join(" · ")}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-ink">Subjects</legend>
          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <label key={subject.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={() => toggle(subject.id, subjectIds, setSubjectIds)} className="h-4 w-4 accent-primary" />
                <span>{subject.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={pending || !name.trim() || !classIds.length || !subjectIds.length}>
            <Plus className="h-4 w-4" />
            Create combination
          </Button>
        </div>
      </div>
    </div>
  );
}
