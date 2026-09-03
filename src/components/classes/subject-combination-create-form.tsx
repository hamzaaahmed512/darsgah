"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useState, useTransition } from "react";
import { Layers3, Plus, Sparkles, X } from "lucide-react";
import { createStudentSubjectCombinationAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

type ClassOption = { id: string; name: string; grade_id?: string | null; grade_name?: string | null; section_name?: string | null };
type SubjectOption = { id: string; name: string };
type GradeOption = { id: string; name: string; classIds: string[] };

export function SubjectCombinationCreateForm({ classes, subjects }: { classes: ClassOption[]; subjects: SubjectOption[] }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradeIds, setGradeIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const grades = getGradesFromClasses(classes);

  function close() {
    setOpen(false);
    setName("");
    setGradeIds([]);
    setSubjectIds([]);
  }

  function toggle(value: string, selected: string[], setSelected: (values: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function submit() {
    const formData = new FormData();
    formData.set("name", name);
    getClassIdsForGrades(grades, gradeIds).forEach((classId) => formData.append("class_id", classId));
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

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
              <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-outline/70 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline/40 px-4 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[1.7rem] font-bold text-ink">Create Combination</h2>
                    <p className="mt-1 break-words text-sm leading-5 text-muted">Create a subject combination and assign it to the grades that can use it.</p>
                  </div>
                  <button type="button" onClick={close} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close form">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                  <div className="grid gap-6">
                    <section className="rounded-[28px] border border-outline/70 bg-white p-5 shadow-card sm:p-6">
                      <div className="mb-5 flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary">
                          <Layers3 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-[1.2rem] font-bold text-ink">Combination Details</h3>
                          <p className="mt-1 text-sm leading-5 text-muted">Name the combination clearly so staff can identify it while assigning students.</p>
                        </div>
                      </div>
                      <Field label="Name" required>
                        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Biology Major" />
                      </Field>
                    </section>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <SelectionPanel
                        icon={<Sparkles className="h-5 w-5" />}
                        title="Grades"
                        description="Choose the grades where this combination should be available."
                        count={`${gradeIds.length} selected`}
                      >
                        <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                          {grades.map((grade) => (
                            <SelectionChip
                              key={grade.id}
                              checked={gradeIds.includes(grade.id)}
                              label={grade.name}
                              onToggle={() => toggle(grade.id, gradeIds, setGradeIds)}
                            />
                          ))}
                        </div>
                      </SelectionPanel>

                      <SelectionPanel
                        icon={<Layers3 className="h-5 w-5" />}
                        title="Subjects"
                        description="Only the selected subjects will appear in this combination."
                        count={`${subjectIds.length} selected`}
                      >
                        <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                          {subjects.map((subject) => (
                            <SelectionChip
                              key={subject.id}
                              checked={subjectIds.includes(subject.id)}
                              label={subject.name}
                              onToggle={() => toggle(subject.id, subjectIds, setSubjectIds)}
                            />
                          ))}
                        </div>
                      </SelectionPanel>
                    </div>

                    <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-outline/50 bg-white/95 px-4 pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
                      <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={submit} disabled={pending || !name.trim() || !gradeIds.length || !subjectIds.length}>
                        {pending ? "Creating..." : "Create combination"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function SelectionPanel({
  icon,
  title,
  description,
  count,
  children
}: {
  icon: ReactNode;
  title: string;
  description: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-outline/70 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          {icon}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[1.2rem] font-bold text-ink">{title}</h3>
            <span className="inline-flex items-center rounded-full border border-outline/60 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-muted">
              {count}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SelectionChip({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
        checked
          ? "border-primary/20 bg-blue-50 text-primary shadow-[0_8px_24px_rgba(37,99,235,0.08)]"
          : "border-outline/60 bg-slate-50/60 text-ink hover:border-primary/15 hover:bg-white"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-outline/70 accent-primary" />
      <span className="truncate">{label}</span>
    </label>
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

function getClassIdsForGrades(grades: GradeOption[], gradeIds: string[]) {
  const selected = new Set(gradeIds);
  return [...new Set(grades.filter((grade) => selected.has(grade.id)).flatMap((grade) => grade.classIds))];
}
