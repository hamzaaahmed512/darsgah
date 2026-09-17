"use client";

import { useState, useTransition } from "react";
import { CheckSquare, X } from "lucide-react";
import { getPromotionRosterAction, promoteStudentsAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";

export function PromotionModal({ classIds, label }: { classIds: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; name: string; admissionNumber: string | null }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function show() {
    setOpen(true);
    startTransition(async () => {
      const roster = await getPromotionRosterAction(classIds);
      setStudents(roster);
      setSelected(roster.map((student) => student.id));
    });
  }

  const retained = students.filter((student) => !selected.includes(student.id));
  function confirm() { setConfirming(true); }
  function submit() { startTransition(async () => { await promoteStudentsAction(classIds, selected, retained.map((student) => student.id)); setOpen(false); setConfirming(false); }); }
  return <>
    <Button type="button" size="sm" variant="secondary" onClick={show} className="rounded-xl text-primary"><CheckSquare className="h-4 w-4" /> Promote</Button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"><div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-white shadow-lift"><div className="flex items-start justify-between border-b border-outline px-6 py-5"><div><h2 className="font-display text-xl font-bold text-ink">Promote {label}</h2><p className="mt-1 text-sm text-muted">Uncheck students who will repeat this class next session.</p></div><button onClick={() => setOpen(false)} className="text-muted"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-6">{confirming ? <div className="rounded-xl bg-warning-soft p-4 text-sm text-ink"><p className="font-bold">Confirm retained students</p><p className="mt-1">{retained.length ? retained.map((student) => student.name).join(", ") : "Every student will be promoted."}</p></div> : pending ? <p className="text-sm text-muted">Loading students…</p> : <div className="grid gap-2">{students.map((student) => <label key={student.id} className="flex items-center gap-3 rounded-xl border border-outline p-3 text-sm"><input type="checkbox" checked={selected.includes(student.id)} onChange={() => setSelected(current => current.includes(student.id) ? current.filter(id => id !==student.id) : [...current, student.id])} className="h-4 w-4 accent-primary" /><span className="flex-1 font-semibold text-ink">{student.name}</span><span className="text-xs text-muted">{student.admissionNumber ?? ""}</span></label>)}</div>}</div><div className="flex justify-end gap-3 border-t border-outline px-6 py-4"><Button type="button" variant="secondary" onClick={() => confirming ? setConfirming(false) : setOpen(false)}>{confirming ? "Back to students" : "Cancel"}</Button><Button disabled={pending} onClick={confirming ? submit : confirm}>{confirming ? "Complete promotion" : "Review promotion"}</Button></div></div></div> : null}
  </>;
}
