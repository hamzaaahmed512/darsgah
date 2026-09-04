"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createSectionClassAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { FormSectionCard } from "@/components/ui/form-section-card";
import { useToast } from "@/components/ui/toast";
import { formatGradeSection } from "@/lib/utils";
import { defaultCombinationOptionsForGrade } from "@/lib/student-majors";

export function AddSectionModal({
  gradeId,
  gradeName,
  triggerClassName,
  triggerLabel = "Create new section"
}: {
  gradeId: string;
  gradeName: string;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const majorOptions = defaultCombinationOptionsForGrade(gradeName);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("grade_id", gradeId);
    formData.set("grade_name", gradeName);
    setError(null);
    startTransition(async () => {
      try {
        await createSectionClassAction(formData);
        pushToast(`Created ${formatGradeSection(gradeName, formData.get("section_name") as string)}.`, "success");
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to create section.");
      }
    });
  }

  return <>
    <Button type="button" variant="secondary" size="sm" className={triggerClassName} onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {triggerLabel}</Button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-outline/70 bg-white shadow-lift">
        <div className="flex items-start justify-between border-b border-outline/50 px-6 py-5">
          <div><h2 className="font-display text-xl font-bold text-ink">New {gradeName} section</h2><p className="mt-1 text-sm text-muted">Default grade subjects will be linked automatically.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-6 bg-slate-50/30 p-6">
          {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
          <FormSectionCard
            icon={<Plus className="h-5 w-5" />}
            title="Section Details"
            description="Set the section name and room first. Default grade subjects will be added automatically."
          >
            <div className="grid gap-4">
              <Field label="Section name" hint="Use a simple label like A, B, Orange, or Morning."><Input name="section_name" required placeholder="e.g. A or Orange" /></Field>
              <Field label="Room (optional)" hint="Add a room now if you already know the section location."><Input name="room" placeholder="e.g. 204" /></Field>
            </div>
          </FormSectionCard>
          {majorOptions.length ? <FormSectionCard title="Majors Offered" description="Choose one major for automatic assignment or multiple majors if students in this section can choose later." badge={`${majorOptions.length} available`}><div className="grid gap-2">{majorOptions.map((option) => <label key={option.value} className="flex items-center gap-3 rounded-xl border border-outline p-3 text-sm font-semibold"><input type="checkbox" name="allowed_major" value={option.value} className="h-4 w-4 accent-primary" />{option.label}</label>)}</div></FormSectionCard> : null}
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending}>{pending ? "Creating..." : "Create section"}</Button></div>
        </form>
      </div>
    </div> : null}
  </>;
}
