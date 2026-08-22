"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createSectionClassAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

export function AddSectionModal({ gradeId, gradeName }: { gradeId: string; gradeName: string }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("grade_id", gradeId);
    formData.set("grade_name", gradeName);
    setError(null);
    startTransition(async () => {
      try {
        await createSectionClassAction(formData);
        pushToast(`Created ${gradeName} Section ${formData.get("section_name")}.`, "success");
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to create section.");
      }
    });
  }

  return <>
    <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create new section</Button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[20px] bg-white shadow-lift">
        <div className="flex items-start justify-between border-b border-outline/50 px-6 py-5">
          <div><h2 className="font-display text-xl font-bold text-ink">New {gradeName} section</h2><p className="mt-1 text-sm text-muted">Default grade subjects will be linked automatically.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-6">
          {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
          <Field label="Section name"><Input name="section_name" required placeholder="e.g. A or Orange" /></Field>
          <Field label="Room (optional)"><Input name="room" placeholder="e.g. 204" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending}>{pending ? "Creating..." : "Create section"}</Button></div>
        </form>
      </div>
    </div> : null}
  </>;
}
