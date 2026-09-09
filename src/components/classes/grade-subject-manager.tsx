"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addGradeSubjectAction, removeGradeSubjectAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { canonicalSubjectName, getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";

type SubjectSuggestion = { id?: string; name: string };

export function GradeSubjectManager({ gradeId, gradeName, availableSubjects, linkedSubjectIds, linkedSubjects = [] }: { gradeId: string; gradeName: string; availableSubjects: Array<{ id: string; name: string }>; linkedSubjectIds: string[]; linkedSubjects?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const available = availableSubjects.filter((subject) => !linkedSubjectIds.includes(subject.id));
  const suggestions = [...new Map<string, SubjectSuggestion>([
    ...getDefaultSubjectsForGrade(gradeName).map((subject): [string, SubjectSuggestion] => [canonicalSubjectName(subject.name), { name: subject.name }]),
    ...available.map((subject): [string, SubjectSuggestion] => [canonicalSubjectName(subject.name), subject])
  ]).values()].sort((a, b) => a.name.localeCompare(b.name));

  function submit(values: { subjectId?: string; name?: string }) {
    const formData = new FormData();
    formData.set("grade_id", gradeId);
    if (values.subjectId) formData.set("subject_id", values.subjectId);
    if (values.name) formData.set("name", values.name);
    startTransition(async () => {
      try {
        await addGradeSubjectAction(formData);
        pushToast("Subject added to every section in this grade.", "success");
        setName(""); router.refresh();
      } catch (error: any) { pushToast(error?.message ?? "Failed to add subject.", "error"); }
    });
  }

  function remove(subject: { id: string; name: string }) {
    if (!confirm(`Remove ${subject.name} from every section in this grade? It will also be removed from combinations that use it.`)) return;
    startTransition(async () => {
      try { await removeGradeSubjectAction(gradeId, subject.id); pushToast(`Removed ${subject.name} from this grade.`, "success"); router.refresh(); }
      catch (error: any) { pushToast(error?.message ?? "Failed to remove subject.", "error"); }
    });
  }

  return <div className="grid gap-3 rounded-[24px] border border-outline/60 bg-slate-50/60 p-4 sm:p-5">
    {linkedSubjects.length ? <div className="grid gap-3 sm:grid-cols-2">{linkedSubjects.map((subject, index) => <div key={subject.id} className="flex items-center gap-3 rounded-[20px] border border-outline/55 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold ${tone(index)}`}>{initials(subject.name)}</div><p className="min-w-0 flex-1 truncate font-semibold text-ink">{subject.name}</p><button type="button" onClick={() => remove(subject)} disabled={pending} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"><Trash2 className="h-4 w-4" /></button></div>)}</div> : null}
    {suggestions.length ? <div>
      <p className="mb-2 text-sm font-semibold text-ink">Available subjects</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((subject) => <label key={canonicalSubjectName(subject.name)} className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline/60 bg-white px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary/40 hover:bg-primary/5">
          <input type="checkbox" checked={false} disabled={pending} onChange={() => submit(subject.id ? { subjectId: subject.id } : { name: subject.name })} className="h-4 w-4 accent-primary" />
          <span>{subject.name}</span>
        </label>)}
      </div>
      <p className="mt-2 text-xs text-muted">Tick a subject to add it to every section in this grade.</p>
    </div> : <p className="text-sm text-muted">All available subjects are already linked to this grade.</p>}
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Create a new subject" />
      <Button type="button" variant="secondary" onClick={() => submit({ name: name.trim() })} disabled={pending || !name.trim()}><Plus className="h-4 w-4" /> Create subject</Button>
    </div>
  </div>;
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function tone(index: number) { return ["border-blue-100 bg-blue-50 text-blue-600", "border-violet-100 bg-violet-50 text-violet-600", "border-cyan-100 bg-cyan-50 text-cyan-600", "border-rose-100 bg-rose-50 text-rose-600"][index % 4]; }
