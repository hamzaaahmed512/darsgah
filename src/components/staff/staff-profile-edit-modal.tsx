"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Pencil, X } from "lucide-react";
import { updateStaffProfileAction } from "@/app/(app)/teachers/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";
import { FormSectionCard } from "@/components/ui/form-section-card";
import { formatCnic, formatPakistaniPhone } from "@/lib/pakistan-format";

type StaffDetails = {
  fullName: string;
  phone?: string | null;
  cnic?: string | null;
  gender?: "male" | "female" | null;
  personalEmail?: string | null;
  department?: string | null;
  jobTitle?: string | null;
};

export function StaffProfileEditModal({ staffId, initial }: { staffId: string; initial: StaffDetails }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateStaffProfileAction(staffId, {
        fullName: String(formData.get("full_name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        cnic: String(formData.get("cnic") ?? ""),
        gender: (String(formData.get("gender") ?? "") || undefined) as "male" | "female" | undefined,
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
    {mounted && open ? createPortal(<div role="dialog" aria-modal="true" aria-labelledby="edit-staff-profile-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline/40 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1"><h2 id="edit-staff-profile-title" className="font-display text-[1.7rem] font-bold text-ink">Edit staff profile</h2><p className="mt-1 break-words text-sm leading-5 text-muted">Salary is managed separately in Payroll.</p></div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={pending} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <form action={submit} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-50/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {error ? <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</p> : null}
          <FormSectionCard
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            title="Profile Details"
            description="Update the staff member's contact and work details here. Salary is still managed separately in Payroll."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" hint="Use the full display name that should appear in staff records."><Input name="full_name" defaultValue={initial.fullName} required /></Field>
              <Field label="Phone" hint="Add a direct contact number if one is available."><Input name="phone" inputMode="numeric" defaultValue={formatPakistaniPhone(initial.phone)} placeholder="0300-0000000" onChange={(event) => { event.currentTarget.value = formatPakistaniPhone(event.currentTarget.value); }} /></Field>
              <Field label="CNIC"><Input name="cnic" inputMode="numeric" maxLength={15} defaultValue={formatCnic(initial.cnic)} placeholder="00000-0000000-0" onChange={(event) => { event.currentTarget.value = formatCnic(event.currentTarget.value); }} /></Field>
              <Field label="Gender"><Select name="gender" defaultValue={initial.gender ?? ""}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></Select></Field>
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
    </div>, document.body) : null}
  </>;
}
