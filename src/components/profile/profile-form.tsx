"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, CheckCircle2, IdCard, Lock, Mail, Phone } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { updateProfileAction } from "@/app/(app)/profile/actions";
import { profileFormSchema, type ProfileFormValues } from "@/lib/validation/profile";
import type { ProfileDetails } from "@/lib/services/profile";
import { initials } from "@/lib/utils";
import { formatPakistaniPhone } from "@/lib/pakistan-format";

function displayValue(value: string | null | undefined, fallback = "Not set") {
  return value && value.trim().length ? value : fallback;
}

export function ProfileForm({ profile }: { profile: ProfileDetails }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditRoleDetails = profile.role === "principal";

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: profile.fullName,
      phone: profile.phone ?? "",
      personalEmail: profile.personalEmail ?? "",
      department: profile.department ?? "",
      jobTitle: profile.jobTitle ?? "",
      address: profile.address ?? "",
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? ""
    }
  });

  const displayName = watch("fullName") || profile.fullName;
  const currentPhone = formatPakistaniPhone(watch("phone") || profile.phone || "");

  function handleCancel() {
    reset({
      fullName: profile.fullName,
      phone: profile.phone ?? "",
      personalEmail: profile.personalEmail ?? "",
      department: profile.department ?? "",
      jobTitle: profile.jobTitle ?? "",
      address: profile.address ?? "",
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? ""
    });
    setEditing(false);
    setMessage(null);
    setError(null);
  }

  function onSubmit(values: ProfileFormValues) {
    if (!editing) return;

    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateProfileAction(values);
        if (res && "error" in res) {
          setError(res.error as string);
          return;
        }

        setMessage("Profile updated successfully.");
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profile could not be updated.");
      }
    });
  }

  const fieldRow = (label: string, value: string | null | undefined, icon: React.ReactNode) => (
    <div className="flex gap-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 break-words font-semibold text-ink">{displayValue(value)}</p>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="card-surface overflow-hidden rounded-[18px]">
        <div className="border-b border-outline bg-surface-low p-6">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary text-2xl font-bold text-white shadow-button">
            {initials(displayName)}
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight text-ink">{displayName}</h2>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-muted">{profile.role.replace("_", " ")}</p>
        </div>

        <div className="grid gap-4 p-5 text-sm">
          {fieldRow("Work Email", profile.email, <Mail className="h-4 w-4" aria-hidden="true" />)}
          {fieldRow("School", profile.schoolName, <IdCard className="h-4 w-4" aria-hidden="true" />)}
          {fieldRow("Current Title", profile.jobTitle, <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />)}
          {fieldRow("Phone", currentPhone ? `+92 ${currentPhone}` : null, <Phone className="h-4 w-4" aria-hidden="true" />)}
        </div>
      </aside>

      <section className="card-surface rounded-[18px] p-6">
        <div className="mb-6">
          <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-primary">Account Details</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">Profile Information</h2>
          <p className="mt-1 text-sm text-muted">
            {editing ? "Update your account details." : "Review your account details and switch into edit mode when needed."}
          </p>
        </div>

        {message ? (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}

        {editing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name" error={errors.fullName?.message}>
              <Input {...register("fullName")} placeholder="Jane Doe" />
            </Field>

            <Field label="Phone" error={errors.phone?.message} hint="Enter 10 digits; spacing is added automatically (e.g. 321 6666666)">
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-outline/60 bg-surface-low px-3 text-sm font-semibold text-muted">
                  +92
                </span>
                <Input
                  {...register("phone")}
                  value={formatPakistaniPhone(watch("phone"))}
                  onChange={(event) => setValue("phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })}
                  className="rounded-l-none"
                  placeholder="321 6666666"
                  inputMode="numeric"
                  maxLength={11}
                />
              </div>
            </Field>

            <Field label="Personal Email" error={errors.personalEmail?.message}>
              <Input {...register("personalEmail")} type="email" placeholder="personal@gmail.com" />
            </Field>

            <Field
              label="Department"
              hint={!canEditRoleDetails ? "Only the principal can change department details." : undefined}
              error={errors.department?.message}
            >
              {canEditRoleDetails ? (
                <Input {...register("department")} placeholder="Admissions, Mathematics, Operations..." />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-low px-3 py-2.5 text-sm">
                  <Lock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  <span className="text-ink">{profile.department || "—"}</span>
                </div>
              )}
            </Field>

            <Field
              label="Job Title"
              hint={!canEditRoleDetails ? "Only the principal can change job title details." : undefined}
              error={errors.jobTitle?.message}
            >
              {canEditRoleDetails ? (
                <Input {...register("jobTitle")} placeholder="Registrar, Teacher, Principal..." />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-low px-3 py-2.5 text-sm">
                  <Lock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  <span className="text-ink">{profile.jobTitle || "—"}</span>
                </div>
              )}
            </Field>

            <div className="md:col-span-2">
              <Field label="Address" error={errors.address?.message}>
                <Input {...register("address")} placeholder="Home or office address" />
              </Field>
            </div>

            <Field label="Emergency Contact Name" error={errors.emergencyContactName?.message}>
              <Input {...register("emergencyContactName")} placeholder="Full name" />
            </Field>
            <Field label="Emergency Contact Phone" error={errors.emergencyContactPhone?.message}>
              <Input
                {...register("emergencyContactPhone")}
                value={formatPakistaniPhone(watch("emergencyContactPhone"))}
                onChange={(event) => setValue("emergencyContactPhone", formatPakistaniPhone(event.target.value), { shouldDirty: true })}
                placeholder="321 6666666"
                inputMode="numeric"
                maxLength={11}
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Full Name</p>
              <p className="mt-2 font-semibold text-ink">{displayValue(profile.fullName)}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Phone</p>
              <p className="mt-2 font-semibold text-ink">{profile.phone ? `+92 ${formatPakistaniPhone(profile.phone)}` : "Not set"}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Personal Email</p>
              <p className="mt-2 break-words font-semibold text-ink">{displayValue(profile.personalEmail)}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Department</p>
              <p className="mt-2 font-semibold text-ink">{displayValue(profile.department, "—")}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Job Title</p>
              <p className="mt-2 font-semibold text-ink">{displayValue(profile.jobTitle, "—")}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">School</p>
              <p className="mt-2 font-semibold text-ink">{displayValue(profile.schoolName)}</p>
            </div>
            <div className="md:col-span-2 rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Address</p>
              <p className="mt-2 font-semibold text-ink">{displayValue(profile.address)}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Emergency Contact</p>
              <p className="mt-2 font-semibold text-ink">{displayValue(profile.emergencyContactName)}</p>
            </div>
            <div className="rounded-[16px] border border-outline/60 bg-surface-low p-4">
              <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">Emergency Phone</p>
              <p className="mt-2 font-semibold text-ink">
                {profile.emergencyContactPhone ? profile.emergencyContactPhone : "Not set"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ButtonLink href="/change-password" variant="secondary">
            Change Password
          </ButtonLink>
          {editing ? (
            <>
              <Button type="button" variant="secondary" onClick={handleCancel} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Profile"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </section>
    </form>
  );
}
