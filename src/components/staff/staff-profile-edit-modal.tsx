"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Pencil, X } from "lucide-react";
import { updateStaffProfileAction } from "@/app/(app)/teachers/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { FormSectionCard } from "@/components/ui/form-section-card";

type StaffDetails = {
  fullName: string;
  phone?: string | null;
  personalEmail?: string | null;
  department?: string | null;
  jobTitle?: string | null;
};

export function StaffProfileEditModal({ staffId, initial }: { staffId: string; initial: StaffDetails }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateStaffProfileAction(staffId, {
        fullName: String(formData.get("full_name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        personalEmail: String(formData.get("personal_email") ?? ""),
        department: String(formData.get("department") ?? ""),
        jobTitle: String(formData.get("job_title") ?? "")
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return <>
    <Button type="button" variant="secondary" onClick={() => setOpen(true)}><Pencil className="h-4 w-4" /> Edit profile</Button>
    {open ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[24px] bg-white shadow-lift sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-4 border-b border-outline/60 px-5 py-4 sm:px-6">
          <div><h2 className="font-display text-xl font-bold text-ink">Edit staff profile</h2><p className="mt-1 text-sm text-muted">Salary is managed separately in Payroll.</p></div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={pending} className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button>
        </div>
        <form action={submit} className="min-h-0 overflow-y-auto bg-slate-50/30 p-5 sm:p-6">
          {error ? <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</p> : null}
          <FormSectionCard
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            title="Profile Details"
            description="Update the staff member's contact and work details here. Salary is still managed separately in Payroll."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" hint="Use the full display name that should appear in staff records."><Input name="full_name" defaultValue={initial.fullName} required /></Field>
              <Field label="Phone" hint="Add a direct contact number if one is available."><Input name="phone" defaultValue={initial.phone ?? ""} /></Field>
              <div className="sm:col-span-2">
                <Field label="Personal email" hint="Optional email for personal contact outside the school login."><Input name="personal_email" type="email" defaultValue={initial.personalEmail ?? ""} /></Field>
              </div>
              <Field label="Department" hint="This helps group the staff member correctly in the directory."><Input name="department" defaultValue={initial.department ?? ""} /></Field>
              <Field label="Job title" hint="Use the current working title that staff should see in the profile."><Input name="job_title" defaultValue={initial.jobTitle ?? ""} /></Field>
            </div>
          </FormSectionCard>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </div>
    </div> : null}
  </>;
}
