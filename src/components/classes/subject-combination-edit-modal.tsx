"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Edit2, Trash2, X } from "lucide-react";
import { deleteStudentSubjectCombinationAction, updateDefaultStudentSubjectCombinationAction, updateStudentSubjectCombinationAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

type ClassOption = { id: string; name: string; grade_id?: string | null; grade_name?: string | null; section_name?: string | null };
type SubjectOption = { id: string; name: string };
type GradeOption = { id: string; name: string; classIds: string[] };

type CombinationData = {
  id?: string;
  value?: string;
  kind?: "default" | "custom";
  name: string;
  gradeId?: string;
  classIds?: string[];
  gradeIds?: string[];
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
  const grades = getGradesFromClasses(classes);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState(combination.name);
  const [gradeIds, setGradeIds] = useState<string[]>(() => combination.gradeId ? [combination.gradeId] : getSelectedGradeIds(grades, combination.classIds ?? [], combination.gradeIds));
  const [subjectIds, setSubjectIds] = useState<string[]>(combination.subjectIds);
  const [pending, startTransition] = useTransition();
  const isDefaultCombination = combination.kind === "default";

  function toggle(value: string, selected: string[], setSelected: (values: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function handleOpen() {
    setName(combination.name);
    setGradeIds(combination.gradeId ? [combination.gradeId] : getSelectedGradeIds(grades, combination.classIds ?? [], combination.gradeIds));
    setSubjectIds(combination.subjectIds);
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
  }

  function handleClose() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 150);
  }

  function submit() {
    const formData = new FormData();
    formData.set("name", name);
    if (isDefaultCombination) {
      formData.set("combination_key", combination.value ?? "");
      formData.set("grade_id", combination.gradeId ?? "");
    } else {
      getClassIdsForGrades(grades, gradeIds).forEach((classId) => formData.append("class_id", classId));
    }
    subjectIds.forEach((subjectId) => formData.append("subject_id", subjectId));

    startTransition(async () => {
      try {
        if (isDefaultCombination) {
          await updateDefaultStudentSubjectCombinationAction(formData);
        } else if (combination.id) {
          await updateStudentSubjectCombinationAction(combination.id, formData);
        }
        pushToast("Combination updated successfully.", "success");
        handleClose();
        router.refresh();
      } catch (error: any) {
        pushToast(error?.message ?? "Failed to update combination.", "error");
      }
    });
  }

  function handleDelete() {
    if (!combination.id || isDefaultCombination) return;
    const combinationId = combination.id;
    if (!confirm("Are you sure you want to delete this combination?")) return;
    startTransition(async () => {
      try {
        await deleteStudentSubjectCombinationAction(combinationId);
        pushToast("Combination deleted.", "success");
        handleClose();
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

      {open ? createPortal(
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
          onClick={handleClose}
        >
          <div
            className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift transition-all duration-150 ${visible ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Edit combination</h2>
                <p className="mt-1 text-sm text-muted">{isDefaultCombination ? "Update combination name or included subjects." : "Update combination name, target grades, or included subjects."}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 overflow-y-auto p-6">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Arts with Computer"
                  autoComplete="off"
                />
              </label>

              {isDefaultCombination ? null : (
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-semibold text-ink">Grades</legend>
                  <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-surface-low p-3 sm:grid-cols-2">
                    {grades.map((grade) => (
                      <label key={grade.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gradeIds.includes(grade.id)}
                          onChange={() => toggle(grade.id, gradeIds, setGradeIds)}
                          className="h-4 w-4 rounded border-outline accent-primary"
                        />
                        <span>{grade.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-ink">Subjects</legend>
                <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-outline/50 bg-surface-low p-3 sm:grid-cols-2 lg:grid-cols-3">
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

            <div className="flex items-center justify-between border-t border-outline/50 px-6 py-5">
              {isDefaultCombination ? <span /> : (
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
              )}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={submit}
                  disabled={pending || !name.trim() || (!isDefaultCombination && !gradeIds.length) || !subjectIds.length}
                >
                  {pending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

function getGradesFromClasses(classes: ClassOption[]): GradeOption[] {
  const byGrade = new Map<string, GradeOption>();
  for (const item of classes) {
    const gradeId = item.grade_id ?? item.grade_name ?? item.name;
    const gradeName = item.grade_name || item.name;
    if (!gradeId || !gradeName) continue;
    const grade = byGrade.get(gradeId) ?? { id: gradeId, name: gradeName, classIds: [] };
    grade.classIds.push(item.id);
    byGrade.set(gradeId, grade);
  }
  return [...byGrade.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function getSelectedGradeIds(grades: GradeOption[], classIds: string[], explicitGradeIds?: string[]) {
  if (explicitGradeIds?.length) return explicitGradeIds;
  const selectedClassIds = new Set(classIds);
  return grades.filter((grade) => grade.classIds.some((classId) => selectedClassIds.has(classId))).map((grade) => grade.id);
}

function getClassIdsForGrades(grades: GradeOption[], gradeIds: string[]) {
  const selected = new Set(gradeIds);
  return [...new Set(grades.filter((grade) => selected.has(grade.id)).flatMap((grade) => grade.classIds))];
}
