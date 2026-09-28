"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, X } from "lucide-react";
import { getPromotionRosterAction, promoteStudentsAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type PromotionStudent = { id: string; name: string; admissionNumber: string | null };

export function PromotionModal({ classIds, label }: { classIds: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<PromotionStudent[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [isTerminalGrade, setIsTerminalGrade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  function show() {
    setOpen(true);
    setConfirming(false);
    startTransition(async () => {
      try {
        const roster = await getPromotionRosterAction(classIds);
        setStudents(roster.students);
        setSelected(roster.students.map((student) => student.id));
        setIsTerminalGrade(roster.isTerminalGrade);
      } catch (error) {
        setOpen(false);
        pushToast(error instanceof Error ? error.message : "Failed to load the promotion roster.", "error");
      }
    });
  }

  const retained = students.filter((student) => !selected.includes(student.id));

  function submit() {
    startTransition(async () => {
      try {
        await promoteStudentsAction(classIds, isTerminalGrade ? [] : selected, retained.map((student) => student.id), isTerminalGrade ? selected : []);
        setOpen(false);
        setConfirming(false);
        pushToast(isTerminalGrade ? "Students graduated successfully." : "Students promoted successfully.");
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Promotion failed.", "error");
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={show} className="h-10 w-10 rounded-xl px-0 text-primary" aria-label={`Promote ${label}`}><CheckSquare className="h-4 w-4" /></Button>
      {mounted && open ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="promotion-title" className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-t-[28px] border border-outline/70 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
            <div className="flex items-start justify-between border-b border-outline px-6 py-5">
              <div>
                <h2 id="promotion-title" className="font-display text-xl font-bold text-ink">{isTerminalGrade ? "Graduate" : "Promote"} {label}</h2>
                <p className="mt-1 text-sm text-muted">Uncheck students who will repeat this class next session.</p>
              </div>
              <button type="button" aria-label="Close promotion dialog" onClick={() => setOpen(false)} className="text-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {confirming ? (
                <div className="rounded-xl bg-warning-soft p-4 text-sm text-ink">
                  <p className="font-bold">Confirm {isTerminalGrade ? "graduation" : "promotion"}</p>
                  <p className="mt-1">{selected.length} {selected.length === 1 ? "student" : "students"} will be {isTerminalGrade ? "graduated" : "promoted"}.</p>
                  <p className="mt-2">{retained.length ? `Repeating: ${retained.map((student) => student.name).join(", ")}` : "No students will repeat this grade."}</p>
                </div>
              ) : pending ? <p className="text-sm text-muted">Loading students…</p> : students.length ? (
                <div className="grid gap-2">
                  {students.map((student) => (
                    <label key={student.id} className="flex items-center gap-3 rounded-xl border border-outline p-3 text-sm">
                      <input type="checkbox" checked={selected.includes(student.id)} onChange={() => setSelected((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} className="h-4 w-4 accent-primary" />
                      <span className="flex-1 font-semibold text-ink">{student.name}</span>
                      <span className="text-xs text-muted">{student.admissionNumber ?? ""}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-surface-low p-4 text-sm text-muted">There are no active students in this class.</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-outline px-6 py-4">
               <Button type="button" variant="secondary" onClick={() => confirming ? setConfirming(false) : setOpen(false)}>{confirming ? "Back to students" : "Cancel"}</Button>
               <Button disabled={pending} onClick={confirming ? submit : () => setConfirming(true)}>{confirming ? `Complete ${isTerminalGrade ? "graduation" : "promotion"}` : `Review ${isTerminalGrade ? "graduation" : "promotion"}`}</Button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
