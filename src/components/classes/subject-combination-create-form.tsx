"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createStudentSubjectCombinationAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { formatGradeSection } from "@/lib/utils";

type ClassOption = { id: string; name: string; grade_name?: string | null; section_name?: string | null };
type SubjectOption = { id: string; name: string };

export function SubjectCombinationCreateForm({ classes, subjects }: { classes: ClassOption[]; subjects: SubjectOption[] }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setName("");
    setClassIds([]);
    setSubjectIds([]);
  }

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
        close();
        router.refresh();
      } catch (error: any) {
        pushToast(error?.message ?? "Failed to create combination.", "error");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create combination
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Create combination</h2>
                <p className="mt-1 text-sm text-muted">Create a new subject combination and assign it to classes.</p>
              </div>
              <button type="button" onClick={close} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close form">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid gap-6 p-6">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Name
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Arts with Computer" />
              </label>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-ink">Classes</legend>
                <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-surface-low p-3 sm:grid-cols-2">
                  {classes.map((item) => {
                    const displayName = formatGradeSection(item.grade_name || item.name, item.section_name);
                    return (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-ink">
                        <input type="checkbox" checked={classIds.includes(item.id)} onChange={() => toggle(item.id, classIds, setClassIds)} className="h-4 w-4 accent-primary" />
                        <span>{displayName}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-ink">Subjects</legend>
                <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-surface-low p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={() => toggle(subject.id, subjectIds, setSubjectIds)} className="h-4 w-4 accent-primary" />
                      <span>{subject.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" onClick={submit} disabled={pending || !name.trim() || !classIds.length || !subjectIds.length}>
                  {pending ? "Creating..." : "Create combination"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
