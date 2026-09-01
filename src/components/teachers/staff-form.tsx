"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import { staffFormSchema, type StaffFormValues } from "@/lib/validation/staff";
import { createStaffAction } from "@/app/(app)/teachers/actions";
import { Plus, X } from "lucide-react";
import type { UserRole } from "@/types/database";
import { normalizeEmail } from "@/lib/email";
import { sanitizeEnglishNameInput } from "@/lib/validation/names";

const roleLabels: Record<UserRole, string> = {
  administrator: "Administrator",
  cashier: "Cashier",
  principal: "Principal",
  staff: "Staff",
  teacher: "Teacher",
  head_teacher: "Teacher",
  student_staff: "Student-management staff"
};

export function StaffFormModal({
  allowedRoles = ["teacher", "student_staff"],
  customRoles = [],
  triggerLabel = "Add User"
}: {
  allowedRoles?: UserRole[];
  customRoles?: Array<{ id: string; name: string; base_role: UserRole }>;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const standardRoleOptions = allowedRoles.map((role) => ({ value: `base:${role}`, label: roleLabels[role], role, customRoleId: "" }));
  const customRoleOptions = customRoles
    .filter((role) => allowedRoles.includes(role.base_role) && role.base_role !== "principal")
    .map((role) => ({ value: `custom:${role.id}`, label: role.name, role: role.base_role, customRoleId: role.id }));
  const roleOptions = [...standardRoleOptions, ...customRoleOptions];
  const [selectedRoleOption, setSelectedRoleOption] = useState(roleOptions[0]?.value ?? `base:${allowedRoles[0] ?? "teacher"}`);

  const { register, handleSubmit, formState: { errors }, reset, setValue, setError: setFieldError, clearErrors } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: { role: allowedRoles[0] ?? "teacher", custom_role_id: undefined }
  });

  function handleRoleChange(value: string) {
    setSelectedRoleOption(value);
    const option = roleOptions.find((item) => item.value === value);
    if (!option) return;
    setValue("role", option.role, { shouldDirty: true, shouldValidate: true });
    setValue("custom_role_id", option.customRoleId || undefined, { shouldDirty: true, shouldValidate: true });
  }

  const onSubmit = (data: StaffFormValues) => {
    setError(null);
    clearErrors("email");
    startTransition(async () => {
      try {
        const result = await createStaffAction(data);
        if (!result.success) {
          if (result.field === "email") {
            setFieldError("email", { type: "server", message: result.error });
            return;
          }
          setError(result.error || "Failed to create account.");
          return;
        }
        reset();
        setSelectedRoleOption(roleOptions[0]?.value ?? `base:${allowedRoles[0] ?? "teacher"}`);
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to create account.");
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus className="h-4 w-4" /> {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-outline/40 px-6 py-4">
              <div>
                <h2 className="text-xl font-display font-bold">Create User Account</h2>
                <p className="mt-1 text-sm text-muted">The user will change their temporary password on first login.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              {error && (
                <div className="mb-4 rounded-md bg-danger-soft p-3 text-sm font-semibold text-danger">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Full Name<span className="ml-0.5 text-danger" aria-hidden="true">*</span></label>
                  <Input
                    {...register("full_name")}
                    required
                    aria-required="true"
                    onChange={(event) => {
                      const sanitized = sanitizeEnglishNameInput(event.target.value);
                      event.currentTarget.value = sanitized;
                      setValue("full_name", sanitized, { shouldDirty: true, shouldValidate: true });
                    }}
                    placeholder="Jane Doe"
                  />
                  {errors.full_name?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.full_name.message}</p> : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Email Address<span className="ml-0.5 text-danger" aria-hidden="true">*</span></label>
                  <Input {...register("email")} required aria-required="true" type="email" placeholder="jane.doe@school.edu" onChange={(event) => setValue("email", normalizeEmail(event.target.value), { shouldDirty: true, shouldValidate: true })} />
                  {errors.email?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.email.message}</p> : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Temporary Password<span className="ml-0.5 text-danger" aria-hidden="true">*</span></label>
                  <Input {...register("password")} required aria-required="true" type="text" placeholder="Auto-generated or type a secure one..." />
                  {errors.password?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.password.message}</p> : null}
                  <p className="mt-1 text-xs text-muted">Share it privately. They must replace it before entering the app.</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Role<span className="ml-0.5 text-danger" aria-hidden="true">*</span></label>
                  <input type="hidden" {...register("role")} />
                  <input type="hidden" {...register("custom_role_id")} />
                  <Select value={selectedRoleOption} onChange={(event) => handleRoleChange(event.target.value)} required aria-required="true">
                    {standardRoleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                    {customRoleOptions.length ? <optgroup label="Custom roles">
                      {customRoleOptions.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </optgroup> : null}
                  </Select>
                  {customRoleOptions.length ? (
                    <p className="mt-1 text-xs text-muted">Custom roles inherit their selected base role and apply the attached permissions.</p>
                  ) : null}
                  {errors.role?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.role.message}</p> : null}
                  {errors.custom_role_id?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.custom_role_id.message}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Department</label>
                  <Input {...register("department")} placeholder="e.g. Science" />
                  {errors.department?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.department.message}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Job Title</label>
                  <Input {...register("job_title")} placeholder="e.g. Math Teacher" />
                  {errors.job_title?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.job_title.message}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Monthly Salary</label>
                  <Input {...register("salary")} type="number" min="0" step="0.01" placeholder="Optional" />
                  {errors.salary?.message ? <p className="mt-1 text-sm font-semibold text-danger">{errors.salary.message}</p> : null}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Provisioning..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
