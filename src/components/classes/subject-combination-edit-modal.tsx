"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, X } from "lucide-react";
import { updateStudentSubjectCombinationAction, deleteStudentSubjectCombinationAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { formatGradeSection } from "@/lib/utils";

type ClassOption = { id: string; name: string; grade_name?: string | null; section_name?: string | null };
type SubjectOption = { id: string; name: string };

type CombinationData = {
  id: string;
  name: string;
  classIds: string[];
  subjectIds: string[];
};

export function SubjectCombinationEditModal({
  combination,
  classes,
  subjects
}: {
  combination: CombinationData;
  classes: ClassOption[];
  subjects: SubjectOption[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(combination.name);
  const [classIds, setClassIds] = useState<string[]>(combination.classIds);
  const [subjectIds, setSubjectIds] = useState<string[]>(combination.subjectIds);
  const [pending, startTransition] = useTransition();

  function toggle(value: string, selected: string[], setSelected: (values: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function handleOpen() {
    setName(combination.name);
    setClassIds(combination.classIds);
    setSubjectIds(combination.subjectIds);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function submit() {
    const formData = new FormData();
    formData.set("name", name);
    classIds.forEach((classId) => formData.append("class_id", classId));
    subjectIds.forEach((subjectId) => formData.append("subject_id", subjectId));

    startTransition(async () => {
      try {
        await updateStudentSubjectCombinationAction(combination.id, formData);
        pushToast("Combination updated successfully.", "success");
        setOpen(false);
        router.refresh();
      } catch (error: any) {
        pushToast(error?.message ?? "Failed to update combination.", "error");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this combination?")) return;
    startTransition(async () => {
      try {
        await deleteStudentSubjectCombinationAction(combination.id);
        pushToast("Combination deleted.", "success");
        setOpen(false);
        router.refresh();
      } catch (error: any) {
        pushToast(error?.message ?? "Failed to delete combination.", "error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-outline/50 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:bg-surface-low hover:text-primary active:scale-95"
      >
        <Edit2 className="h-3.5 w-3.5" />
        Edit Combination
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-outline/40 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Edit Combination</h2>
                <p className="mt-0.5 text-xs text-muted">Update combination name, target classes, or included subjects.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-low hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 overflow-y-auto p-6">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Arts with Computer"
                  autoComplete="off"
                />
              </label>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-ink">Classes</legend>
                <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-surface-low/50 p-3 sm:grid-cols-2">
                  {classes.map((item) => {
                    const displayName = formatGradeSection(item.grade_name || item.name, item.section_name);
                    return (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={classIds.includes(item.id)}
                          onChange={() => toggle(item.id, classIds, setClassIds)}
                          className="h-4 w-4 rounded border-outline accent-primary"
                        />
                        <span>{displayName}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-ink">Subjects</legend>
                <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-surface-low/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subjectIds.includes(subject.id)}
                        onChange={() => toggle(subject.id, subjectIds, setSubjectIds)}
                        className="h-4 w-4 rounded border-outline accent-primary"
                      />
                      <span className="truncate">{subject.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex items-center justify-between border-t border-outline/40 px-6 py-4">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={pending}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={submit}
                  disabled={pending || !name.trim() || !classIds.length || !subjectIds.length}
                >
                  {pending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
