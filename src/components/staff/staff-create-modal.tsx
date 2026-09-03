"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { createOtherStaffAction, createStaffAction } from "@/app/(app)/teachers/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";
import { PakistaniPhoneInput } from "@/components/ui/pakistani-phone-input";
import { OTHER_STAFF_CATEGORIES, OTHER_STAFF_CATEGORY_LABELS, type OtherStaffCategory } from "@/lib/constants/staff";
import { normalizeEmail } from "@/lib/email";
import { sanitizeEnglishNameInput } from "@/lib/validation/names";
import { staffFormSchema, type StaffFormValues } from "@/lib/validation/staff";
import type { UserRole } from "@/types/database";

const roleLabels: Record<UserRole, string> = {
  administrator: "Administrator",
  cashier: "Cashier",
  principal: "Principal",
  staff: "Staff",
  teacher: "Teacher",
  head_teacher: "Teacher",
  student_staff: "Student-management staff"
};

type StaffMode = "account" | "record";

export function StaffCreateModal({
  allowedRoles = ["teacher", "student_staff"],
  customRoles = []
}: {
  allowedRoles?: UserRole[];
  customRoles?: Array<{ id: string; name: string; base_role: UserRole }>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<StaffMode>("account");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({
    fullName: "",
    category: "peon" as OtherStaffCategory,
    department: "Others",
    jobTitle: "",
    phone: "",
    monthlySalary: ""
  });

  const standardRoleOptions = allowedRoles.map((role) => ({
    value: `base:${role}`,
    label: roleLabels[role],
    role,
    customRoleId: ""
  }));
  const customRoleOptions = customRoles
    .filter((role) => allowedRoles.includes(role.base_role) && role.base_role !== "principal")
    .map((role) => ({
      value: `custom:${role.id}`,
      label: role.name,
      role: role.base_role,
      customRoleId: role.id
    }));
  const roleOptions = [...standardRoleOptions, ...customRoleOptions];
  const defaultRoleOption = roleOptions[0]?.value ?? `base:${allowedRoles[0] ?? "teacher"}`;
  const [selectedRoleOption, setSelectedRoleOption] = useState(defaultRoleOption);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError: setFieldError,
    clearErrors
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: { role: allowedRoles[0] ?? "teacher", custom_role_id: undefined }
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  function closeModal() {
    setOpen(false);
    setError(null);
  }

  function resetRecordForm() {
    setRecordForm({
      fullName: "",
      category: "peon",
      department: "Others",
      jobTitle: "",
      phone: "",
      monthlySalary: ""
    });
  }

  function handleRoleChange(value: string) {
    setSelectedRoleOption(value);
    const option = roleOptions.find((item) => item.value === value);
    if (!option) return;
    setValue("role", option.role, { shouldDirty: true, shouldValidate: true });
    setValue("custom_role_id", option.customRoleId || undefined, { shouldDirty: true, shouldValidate: true });
  }

  function updateRecordForm<K extends keyof typeof recordForm>(key: K, value: (typeof recordForm)[K]) {
    setRecordForm((current) => ({ ...current, [key]: value }));
  }

  function submitAccount(values: StaffFormValues) {
    setError(null);
    clearErrors("email");
    startTransition(async () => {
      try {
        const result = await createStaffAction(values);
        if (!result.success) {
          if (result.field === "email") {
            setFieldError("email", { type: "server", message: result.error });
            return;
          }
          setError(result.error || "Failed to create account.");
          return;
        }
        reset();
        setSelectedRoleOption(defaultRoleOption);
        closeModal();
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to create account.");
      }
    });
  }

  function submitRecord(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createOtherStaffAction({
          fullName: recordForm.fullName,
          category: recordForm.category,
          department: recordForm.department,
          jobTitle: recordForm.jobTitle,
          phone: recordForm.phone,
          monthlySalary: recordForm.monthlySalary ? Number(recordForm.monthlySalary) : null
        });
        resetRecordForm();
        closeModal();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add staff record.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 sm:w-auto">
        <Plus className="h-4 w-4" />
        Add Staff
      </Button>

      {mounted
        ? createPortal(
            open ? (
              <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-t-[28px] border border-outline/70 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
                  <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline/40 px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-[1.7rem] font-bold text-ink">Add Staff</h2>
                      <p className="mt-1 break-words text-sm leading-5 text-muted">
                        Create a login account for school staff or save a record-only staff profile from one form.
                      </p>
                    </div>
                    <button type="button" onClick={closeModal} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("account");
                          setError(null);
                        }}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          mode === "account"
                            ? "border-primary/20 bg-blue-50 shadow-[0_10px_30px_rgba(37,99,235,0.08)]"
                            : "border-outline/60 bg-white hover:border-primary/15"
                        }`}
                      >
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <p className="text-base font-bold text-ink">Account Staff</p>
                        <p className="mt-1 text-sm leading-5 text-muted">Creates login access for teachers and staff members.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("record");
                          setError(null);
                        }}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          mode === "record"
                            ? "border-primary/20 bg-blue-50 shadow-[0_10px_30px_rgba(37,99,235,0.08)]"
                            : "border-outline/60 bg-white hover:border-primary/15"
                        }`}
                      >
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <p className="text-base font-bold text-ink">Record-Only Staff</p>
                        <p className="mt-1 text-sm leading-5 text-muted">For peons, guards, cleaners, drivers, and similar staff without app access.</p>
                      </button>
                    </div>

                    {error ? (
                      <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 p-4">
                        <p className="text-sm font-medium text-danger">{error}</p>
                      </div>
                    ) : null}

                    {mode === "account" ? (
                      <form onSubmit={handleSubmit(submitAccount)} className="grid gap-6">
                        <FormBlock
                          title="Account Details"
                          description="These details are used for the staff member's login and access level."
                        >
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Full Name" required error={errors.full_name?.message}>
                              <Input
                                {...register("full_name")}
                                required
                                aria-required="true"
                                placeholder="Jane Doe"
                                onChange={(event) => {
                                  const sanitized = sanitizeEnglishNameInput(event.target.value);
                                  event.currentTarget.value = sanitized;
                                  setValue("full_name", sanitized, { shouldDirty: true, shouldValidate: true });
                                }}
                              />
                            </Field>

                            <Field label="Email Address" required error={errors.email?.message}>
                              <Input
                                {...register("email")}
                                required
                                aria-required="true"
                                type="email"
                                placeholder="jane.doe@school.edu"
                                onChange={(event) => setValue("email", normalizeEmail(event.target.value), { shouldDirty: true, shouldValidate: true })}
                              />
                            </Field>

                            <Field label="Temporary Password" required error={errors.password?.message} hint="Share it privately. They must change it on first login.">
                              <Input {...register("password")} required aria-required="true" type="text" placeholder="Enter a secure temporary password" />
                            </Field>

                            <Field label="Role" required error={errors.role?.message || errors.custom_role_id?.message}>
                              <>
                                <input type="hidden" {...register("role")} />
                                <input type="hidden" {...register("custom_role_id")} />
                                <Select value={selectedRoleOption} onChange={(event) => handleRoleChange(event.target.value)} required aria-required="true">
                                  {standardRoleOptions.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                  {customRoleOptions.length ? (
                                    <optgroup label="Custom roles">
                                      {customRoleOptions.map((role) => (
                                        <option key={role.value} value={role.value}>
                                          {role.label}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ) : null}
                                </Select>
                              </>
                            </Field>
                          </div>
                        </FormBlock>

                        <FormBlock
                          title="Work Details"
                          description="Add optional information for directory display and payroll setup."
                        >
                          <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Department" error={errors.department?.message}>
                              <Input {...register("department")} placeholder="e.g. Science" />
                            </Field>
                            <Field label="Job Title" error={errors.job_title?.message}>
                              <Input {...register("job_title")} placeholder="e.g. Math Teacher" />
                            </Field>
                            <Field label="Monthly Salary" error={errors.salary?.message}>
                              <Input {...register("salary")} type="number" min="0" step="0.01" placeholder="Optional" />
                            </Field>
                          </div>
                        </FormBlock>

                        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-outline/50 bg-white/95 px-4 pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
                          <Button type="button" variant="secondary" onClick={closeModal} disabled={pending}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={pending}>
                            {pending ? "Provisioning..." : "Create Account"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={submitRecord} className="grid gap-6">
                        <FormBlock
                          title="Staff Record"
                          description="Create a profile for staff members who do not need app login access."
                        >
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Full Name" required>
                              <Input required value={recordForm.fullName} onChange={(event) => updateRecordForm("fullName", sanitizeEnglishNameInput(event.target.value))} />
                            </Field>
                            <Field label="Category" required>
                              <Select value={recordForm.category} onChange={(event) => updateRecordForm("category", event.target.value as OtherStaffCategory)}>
                                {OTHER_STAFF_CATEGORIES.map((category) => (
                                  <option key={category} value={category}>
                                    {OTHER_STAFF_CATEGORY_LABELS[category]}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                            <Field label="Department">
                              <Input value={recordForm.department} onChange={(event) => updateRecordForm("department", event.target.value)} placeholder="Others" />
                            </Field>
                            <Field label="Job Title">
                              <Input value={recordForm.jobTitle} onChange={(event) => updateRecordForm("jobTitle", event.target.value)} placeholder="Peon, Guard, Cleaner..." />
                            </Field>
                            <Field label="Phone">
                              <PakistaniPhoneInput value={recordForm.phone} onChange={(event) => updateRecordForm("phone", event.target.value)} />
                            </Field>
                            <Field label="Monthly Salary">
                              <Input type="number" min="0" step="0.01" value={recordForm.monthlySalary} onChange={(event) => updateRecordForm("monthlySalary", event.target.value)} placeholder="Optional" />
                            </Field>
                          </div>
                        </FormBlock>

                        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-outline/50 bg-white/95 px-4 pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
                          <Button type="button" variant="secondary" disabled={pending} onClick={closeModal}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={pending}>
                            {pending ? "Saving..." : "Save Staff Record"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ) : null,
            document.body
          )
        : null}
    </>
  );
}

function FormBlock({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-outline/70 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5">
        <h3 className="font-display text-[1.2rem] font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
