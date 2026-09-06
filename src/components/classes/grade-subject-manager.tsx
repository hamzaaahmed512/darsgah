"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addGradeSubjectAction, removeGradeSubjectAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

export function GradeSubjectManager({ gradeId, availableSubjects, linkedSubjectIds, linkedSubjects = [] }: { gradeId: string; availableSubjects: Array<{ id: string; name: string }>; linkedSubjectIds: string[]; linkedSubjects?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const available = availableSubjects.filter((subject) => !linkedSubjectIds.includes(subject.id));

  function submit(values: { subjectId?: string; name?: string }) {
    const formData = new FormData();
    formData.set("grade_id", gradeId);
    if (values.subjectId) formData.set("subject_id", values.subjectId);
    if (values.name) formData.set("name", values.name);
    startTransition(async () => {
      try {
        await addGradeSubjectAction(formData);
        pushToast("Subject added to every section in this grade.", "success");
        setSubjectId(""); setName(""); router.refresh();
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
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="h-10 rounded-xl border border-outline bg-white px-3 text-sm text-ink">
        <option value="">Select an existing subject...</option>
        {available.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
      </select>
      <Button type="button" variant="secondary" onClick={() => submit({ subjectId })} disabled={pending || !subjectId}>Add subject</Button>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Create a new subject" />
      <Button type="button" variant="secondary" onClick={() => submit({ name: name.trim() })} disabled={pending || !name.trim()}><Plus className="h-4 w-4" /> Create subject</Button>
    </div>
  </div>;
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function tone(index: number) { return ["border-blue-100 bg-blue-50 text-blue-600", "border-violet-100 bg-violet-50 text-violet-600", "border-cyan-100 bg-cyan-50 text-cyan-600", "border-rose-100 bg-rose-50 text-rose-600"][index % 4]; }
