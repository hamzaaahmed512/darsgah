"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeStudentFormValues, studentSchema, type StudentFormValues } from "@/lib/validation/students";
import { formatCnic, formatPakistaniPhone } from "@/lib/pakistan-format";
import { defaultCombinationOptionsForGrade, type StudentCombinationOption } from "@/lib/student-majors";
import { normalizeEmail } from "@/lib/email";

export function StudentForm({
  initialValues,
  classes,
  combinations = [],
  onSubmit,
  submitLabel
}: {
  initialValues?: Partial<StudentFormValues>;
  classes: Array<{ id: string; name: string; grade_name: string; section_name: string | null }>;
  combinations?: StudentCombinationOption[];
  onSubmit: (values: StudentFormValues) => Promise<void | { error?: string }>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const emptyValues = {
    admission_number: "",
    name_en: "",
    name_ur: "",
    father_name_en: "",
    father_name_ur: "",
    father_phone: "",
    father_cnic: "",
    father_alive: "yes",
    photo_url: "",
    date_of_birth: "",
    gender: undefined as any,
    religion: "",
    email: "",
    phone: "",
    address: "",
    admission_date: new Date().toISOString().slice(0, 10),
    status: "active",
    class_id: "",
    major: "",
    guardian_name: "",
    guardian_relationship: "",
    guardian_email: "",
    guardian_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    ...initialValues
  } as any;
  const defaultValues = Object.fromEntries(
    Object.entries(emptyValues).map(([key, value]) => [key, value == null ? "" : value])
  ) as any;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues
  });
  const selectedClass = classes.find((item) => item.id === watch("class_id"));
  const majorOptions = useMemo(() => selectedClass
    ? [
        ...defaultCombinationOptionsForGrade(selectedClass.grade_name),
        ...combinations.filter((combination) => combination.classIds?.includes(selectedClass.id))
      ]
    : [], [combinations, selectedClass]);
  const fatherAlive = watch("father_alive");
  useEffect(() => {
    const currentMajor = watch("major");
    if (currentMajor && !majorOptions.some((option) => option.value === currentMajor)) {
      setValue("major", null, { shouldDirty: true });
    }
  }, [majorOptions, setValue, watch]);

  function submit(values: StudentFormValues) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await onSubmit(sanitizeStudentFormValues(values));
        if (result && result.error) {
          setServerError(result.error);
        } else if (!initialValues) {
          reset({ ...emptyValues, admission_date: new Date().toISOString().slice(0, 10) });
          router.refresh();
        }
      } catch (err: any) {
        if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setServerError(err.message || "An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit(submit)} autoComplete="off">
      {serverError && (
        <div className="rounded-lg bg-danger/10 p-4 border border-danger/20">
          <p className="text-sm font-medium text-danger">{serverError}</p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Admission number" error={errors.admission_number?.message}>
            <Input {...register("admission_number")} autoComplete="off" />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="archived">Archived</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Name (English)" error={errors.name_en?.message}>
            <Input {...register("name_en")} placeholder="e.g. John Doe" autoComplete="off" />
          </Field>
          <Field label="Name (Urdu)" error={errors.name_ur?.message}>
            <Input {...register("name_ur")} dir="rtl" placeholder="e.g. جان ڈو" autoComplete="off" />
          </Field>
          <Field label="Gender" error={errors.gender?.message}>
            <div className="flex gap-4 items-center h-10">
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="male" {...register("gender")} /> Male</label>
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="female" {...register("gender")} /> Female</label>
            </div>
          </Field>
          <Field label="Religion" error={errors.religion?.message}>
            <Select {...register("religion")}>
              <option value="">Select religion...</option>
              <option value="Islam">Islam</option>
              <option value="Christianity">Christianity</option>
              <option value="Hinduism">Hinduism</option>
              <option value="Sikhism">Sikhism</option>
              <option value="Other">Other</option>
            </Select>
          </Field>

          <Field label="Date of birth" error={errors.date_of_birth?.message}>
            <Input type="date" {...register("date_of_birth")} autoComplete="off" />
          </Field>
          <Field label="Admission date" error={errors.admission_date?.message}>
            <Input type="date" {...register("admission_date")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} onChange={(event) => setValue("email", normalizeEmail(event.target.value), { shouldDirty: true, shouldValidate: true })} autoComplete="new-password" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} value={formatPakistaniPhone(watch("phone"))} onChange={(event) => setValue("phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })} inputMode="numeric" maxLength={12} placeholder="0300-0000000" autoComplete="new-password" />
          </Field>
          <Field label="Class assignment" error={errors.class_id?.message}>
            <Select {...register("class_id")}>
              <option value="">No class yet</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.grade_name} • {item.name}
                  {item.section_name ? ` • ${item.section_name}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          {majorOptions.length ? (
            <Field label="Combination / major" error={errors.major?.message}>
              <Select {...register("major")}>
                <option value="">Select combination...</option>
                {majorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Address (optional)" error={errors.address?.message}>
            <Textarea {...register("address")} autoComplete="new-password" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Father & Guardian Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Father's Name (English)" error={errors.father_name_en?.message}>
            <Input {...register("father_name_en")} autoComplete="new-password" />
          </Field>
          <Field label="Father's Name (Urdu)" error={errors.father_name_ur?.message}>
            <Input {...register("father_name_ur")} dir="rtl" autoComplete="off" />
          </Field>
          <Field label="Father's Phone" error={errors.father_phone?.message}>
            <Input {...register("father_phone")} value={formatPakistaniPhone(watch("father_phone"))} onChange={(event) => setValue("father_phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })} inputMode="numeric" maxLength={12} placeholder="0300-0000000" autoComplete="new-password" />
          </Field>
          <Field label="Father's CNIC" error={errors.father_cnic?.message}>
            <Input {...register("father_cnic")} value={formatCnic(watch("father_cnic"))} onChange={(event) => setValue("father_cnic", formatCnic(event.target.value), { shouldDirty: true, shouldValidate: true })} placeholder="0000012345678" inputMode="numeric" maxLength={15} autoComplete="new-password" />
          </Field>
          <Field label="Father alive?" error={errors.father_alive?.message}>
            <div className="flex gap-4 items-center h-10">
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="yes" {...register("father_alive")} /> Yes</label>
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="no" {...register("father_alive")} /> No</label>
            </div>
          </Field>
          
          <div className="col-span-full border-t border-outline/50 my-2 pt-4">
            <p className="text-sm font-semibold mb-3">{fatherAlive === "no" ? "Guardian Info" : "Guardian Info (Optional)"}</p>
          </div>
          
          <Field label="Guardian name" error={errors.guardian_name?.message}>
            <Input {...register("guardian_name")} autoComplete="new-password" />
          </Field>
          <Field label="Relationship" error={errors.guardian_relationship?.message}>
            <Input {...register("guardian_relationship")} autoComplete="off" />
          </Field>
          <Field label="Guardian email" error={errors.guardian_email?.message}>
            <Input type="email" {...register("guardian_email")} onChange={(event) => setValue("guardian_email", normalizeEmail(event.target.value), { shouldDirty: true, shouldValidate: true })} autoComplete="new-password" />
          </Field>
          <Field label="Guardian phone" error={errors.guardian_phone?.message}>
            <Input {...register("guardian_phone")} value={formatPakistaniPhone(watch("guardian_phone"))} onChange={(event) => setValue("guardian_phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })} inputMode="numeric" maxLength={12} placeholder="0300-0000000" autoComplete="new-password" />
          </Field>
          <Field label="Emergency contact name" error={errors.emergency_contact_name?.message}>
            <Input {...register("emergency_contact_name")} autoComplete="new-password" />
          </Field>
          <Field label="Emergency phone" error={errors.emergency_contact_phone?.message}>
            <Input {...register("emergency_contact_phone")} value={formatPakistaniPhone(watch("emergency_contact_phone"))} onChange={(event) => setValue("emergency_contact_phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })} inputMode="numeric" maxLength={12} placeholder="0300-0000000" autoComplete="new-password" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}
