"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { getNextAdmissionNumberAction, validateStudentIdentifiersAction } from "@/app/(app)/students/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAdmissionYear, sanitizeAdmissionNumberInput } from "@/lib/admission-number";
import { sanitizeStudentFormValues, studentSchema, type StudentFormValues } from "@/lib/validation/students";
import { formatCnic, formatPakistaniPhone } from "@/lib/pakistan-format";
import { canSelectStudentCombination, defaultCombinationOptionsForGrade, normalizeStudentMajorValue, type StudentCombinationOption } from "@/lib/student-majors";
import { normalizeEmail } from "@/lib/email";
import { formatClassDisplayName } from "@/lib/utils";
import { sanitizeEnglishNameInput, sanitizeUrduNameInput } from "@/lib/validation/names";

type EnglishNameField = "name_en" | "father_name_en" | "guardian_name";
type UrduNameField = "name_ur" | "father_name_ur";

export function StudentForm({
  initialValues,
  classes,
  combinations = [],
  onSubmit,
  submitLabel,
  studentId
}: {
  initialValues?: Partial<StudentFormValues>;
  classes: Array<{ id: string; name: string; grade_name: string; section_name: string | null; major_count?: number; default_major?: string | null; allowed_majors?: string[] }>;
  combinations?: StudentCombinationOption[];
  onSubmit: (values: StudentFormValues) => Promise<void | { error?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  studentId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [autoGenerateAdmissionNumber, setAutoGenerateAdmissionNumber] = useState(!initialValues?.admission_number);
  const [admissionNumberLoading, setAdmissionNumberLoading] = useState(false);
  const [admissionNumberRefreshKey, setAdmissionNumberRefreshKey] = useState(0);
  const isCreateMode = !initialValues?.admission_number;
  const currentAdmissionYear = getCurrentAdmissionYear();
  const emptyValues = {
    admission_number: "",
    student_cnic: "",
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
    ...initialValues
  } as any;
  const defaultValues = Object.fromEntries(
    Object.entries(emptyValues).map(([key, value]) => [key, value == null ? "" : value])
  ) as any;
  defaultValues.major = normalizeStudentMajorValue(defaultValues.major) ?? defaultValues.major ?? "";
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors }
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues
  });
  const selectedClass = classes.find((item) => item.id === watch("class_id"));
  const canSelectCombination = canSelectStudentCombination(selectedClass?.grade_name);
  const majorOptions = useMemo(() => selectedClass
    ? canSelectStudentCombination(selectedClass.grade_name)
      ? [
        ...defaultCombinationOptionsForGrade(selectedClass.grade_name),
        ...combinations.filter((combination) => combination.classIds?.includes(selectedClass.id))
      ].filter((option) => !selectedClass.allowed_majors?.length || selectedClass.allowed_majors.includes(option.value))
      : []
    : [], [combinations, selectedClass]);
  const fatherAlive = watch("father_alive");
  const admissionNumber = watch("admission_number") ?? "";
  const studentCnic = watch("student_cnic") ?? "";
  const fatherCnic = watch("father_cnic") ?? "";
  const fatherPhone = watch("father_phone") ?? "";
  useEffect(() => {
    const currentMajor = watch("major");
    const normalizedMajor = normalizeStudentMajorValue(currentMajor);
    if (currentMajor && normalizedMajor && currentMajor !== normalizedMajor) {
      setValue("major", normalizedMajor as any, { shouldDirty: false, shouldValidate: false });
      return;
    }
    if (canSelectCombination && normalizedMajor && !majorOptions.some((option) => option.value === normalizedMajor)) {
      setValue("major", null, { shouldDirty: true });
    }
  }, [canSelectCombination, majorOptions, setValue, watch]);

  useEffect(() => {
    if (selectedClass?.major_count === 1 && selectedClass.default_major) {
      setValue("major", selectedClass.default_major as any, { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedClass?.default_major, selectedClass?.major_count, setValue]);

  useEffect(() => {
    if (!isCreateMode || !autoGenerateAdmissionNumber) return;
    let active = true;

    async function loadNextAdmissionNumber() {
      setAdmissionNumberLoading(true);
      try {
        const result = await getNextAdmissionNumberAction();
        if (!active) return;
        setValue("admission_number", result.admissionNumber as any, { shouldDirty: false, shouldValidate: true });
      } catch (err) {
        if (!active) return;
        setServerError(err instanceof Error ? err.message : "Could not load the next admission number.");
      } finally {
        if (active) setAdmissionNumberLoading(false);
      }
    }

    void loadNextAdmissionNumber();
    return () => {
      active = false;
    };
  }, [admissionNumberRefreshKey, autoGenerateAdmissionNumber, isCreateMode, setValue]);

  useEffect(() => {
    const formattedStudentCnic = formatCnic(studentCnic);
    const formattedFatherCnic = formatCnic(fatherCnic);
    const formattedFatherPhone = formatPakistaniPhone(fatherPhone);
    const shouldValidateStudentCnic = formattedStudentCnic.length === 15;
    const shouldValidateFatherPhone = formattedFatherPhone.length === 12;

    if (!shouldValidateStudentCnic && !shouldValidateFatherPhone) {
      clearErrors(["student_cnic", "father_phone"]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await validateStudentIdentifiersAction({
          studentCnic: shouldValidateStudentCnic ? formattedStudentCnic : null,
          fatherCnic: formattedFatherCnic.length === 15 ? formattedFatherCnic : null,
          fatherPhone: shouldValidateFatherPhone ? formattedFatherPhone : null,
          currentStudentId: studentId
        });

        clearErrors(["student_cnic", "father_phone"]);
        if (result.errors.student_cnic) {
          setError("student_cnic", { type: "server", message: result.errors.student_cnic });
        }
        if (result.errors.father_phone) {
          setError("father_phone", { type: "server", message: result.errors.father_phone });
        }
      } catch {
        // Best-effort live validation; submit remains authoritative.
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [clearErrors, fatherCnic, fatherPhone, setError, studentCnic, studentId]);

  function handleEnglishNameChange(field: EnglishNameField, value: string) {
    setValue(field as any, sanitizeEnglishNameInput(value), { shouldDirty: true, shouldValidate: true });
  }

  function handleUrduNameChange(field: UrduNameField, value: string) {
    setValue(field as any, sanitizeUrduNameInput(value), { shouldDirty: true, shouldValidate: true });
  }

  function handleAdmissionNumberToggle(checked: boolean) {
    setAutoGenerateAdmissionNumber(checked);
    setServerError(null);
    if (!checked && !admissionNumber) {
      setValue("admission_number", `${currentAdmissionYear}-` as any, { shouldDirty: true, shouldValidate: false });
    }
  }



  function submit(values: StudentFormValues) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await onSubmit(sanitizeStudentFormValues(values));
        if (result && result.error) {
          if (result.fieldErrors) {
            for (const [field, message] of Object.entries(result.fieldErrors)) {
              setError(field as keyof StudentFormValues, { type: "server", message });
            }
          }
          setServerError(result.error);
        } else if (!initialValues) {
          reset({ ...emptyValues, admission_date: new Date().toISOString().slice(0, 10) });
          if (autoGenerateAdmissionNumber) {
            setAdmissionNumberRefreshKey((value) => value + 1);
          }
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
          <div className="grid gap-2.5 text-sm font-semibold text-ink">
            <div className="flex items-center justify-between gap-4">
              <span>Admission number</span>
              {isCreateMode ? (
                <label className="flex items-center gap-2 text-xs font-medium text-muted">
                  <input
                    type="checkbox"
                    checked={autoGenerateAdmissionNumber}
                    onChange={(event) => handleAdmissionNumberToggle(event.target.checked)}
                  />
                  Auto-generate
                </label>
              ) : null}
            </div>
            <Input
              {...register("admission_number")}
              value={admissionNumber}
              onChange={(event) => {
                const sanitized = sanitizeAdmissionNumberInput(event.target.value, currentAdmissionYear);
                event.currentTarget.value = sanitized;
                setValue("admission_number", sanitized as any, { shouldDirty: true, shouldValidate: true });
              }}
              autoComplete="off"
              inputMode="numeric"
              readOnly={isCreateMode && autoGenerateAdmissionNumber}
              disabled={isCreateMode && autoGenerateAdmissionNumber}
              placeholder={`${currentAdmissionYear}-12`}
            />
            <span className="text-xs font-medium leading-5 text-muted">
              {isCreateMode && autoGenerateAdmissionNumber
                ? admissionNumberLoading
                  ? "Loading the next current-year admission number."
                  : "The next available current-year admission number is assigned automatically."
                : "Enter the current-year admission number using YYYY-RR, for example 2026-12."}
            </span>
            {errors.admission_number?.message ? <span className="text-sm font-medium text-danger">{errors.admission_number.message}</span> : null}
          </div>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="archived">Archived</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Student CNIC / Form-B" error={errors.student_cnic?.message}>
            <Input
              {...register("student_cnic")}
              value={formatCnic(studentCnic)}
              onChange={(event) => setValue("student_cnic", formatCnic(event.target.value) as any, { shouldDirty: true, shouldValidate: true })}
              placeholder="00000-0000000-0"
              inputMode="numeric"
              maxLength={15}
              autoComplete="off"
            />
          </Field>
          <Field label="Name (English)" required error={errors.name_en?.message}>
            <Input {...register("name_en")} value={watch("name_en") ?? ""} onChange={(event) => handleEnglishNameChange("name_en", event.target.value)} placeholder="e.g. John Doe" autoComplete="off" />
          </Field>
          <Field label="Name (Urdu)" error={errors.name_ur?.message}>
            <Input {...register("name_ur")} value={watch("name_ur") ?? ""} onChange={(event) => handleUrduNameChange("name_ur", event.target.value)} dir="rtl" placeholder="e.g. جان ڈو" autoComplete="off" />
          </Field>
          <Field label="Gender" required error={errors.gender?.message}>
            <div className="flex gap-4 items-center h-10">
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="male" {...register("gender")} required /> Male</label>
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="female" {...register("gender")} required /> Female</label>
            </div>
          </Field>
          <Field label="Religion" required error={errors.religion?.message}>
            <Select {...register("religion")}>
              <option value="">Select religion...</option>
              <option value="Islam">Islam</option>
              <option value="Christianity">Christianity</option>
              <option value="Hinduism">Hinduism</option>
              <option value="Sikhism">Sikhism</option>
              <option value="Other">Other</option>
            </Select>
          </Field>

          <Field label="Date of birth" required error={errors.date_of_birth?.message}>
            <Input type="date" {...register("date_of_birth")} required aria-required="true" autoComplete="off" />
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
                  {formatClassDisplayName(item.grade_name, item.name, item.section_name)}
                </option>
              ))}
            </Select>
          </Field>
          {canSelectCombination && majorOptions.length ? (
            <Field label="Combination / major" error={errors.major?.message}>
              <Select {...register("major")} required={(selectedClass?.major_count ?? 0) > 1} disabled={selectedClass?.major_count === 1}>
                <option value="">{selectedClass?.major_count === 1 ? "Assigned automatically" : "Select combination..."}</option>
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
          <Field label="Father's Name (English)" required error={errors.father_name_en?.message}>
            <Input {...register("father_name_en")} value={watch("father_name_en") ?? ""} onChange={(event) => handleEnglishNameChange("father_name_en", event.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Father's Name (Urdu)" error={errors.father_name_ur?.message}>
            <Input {...register("father_name_ur")} value={watch("father_name_ur") ?? ""} onChange={(event) => handleUrduNameChange("father_name_ur", event.target.value)} dir="rtl" autoComplete="off" />
          </Field>
          <Field label="Father's Phone" required error={errors.father_phone?.message}>
            <Input {...register("father_phone")} value={formatPakistaniPhone(watch("father_phone"))} onChange={(event) => setValue("father_phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })} inputMode="numeric" maxLength={12} placeholder="0300-0000000" autoComplete="new-password" />
          </Field>
          <Field label="Father's CNIC" required error={errors.father_cnic?.message}>
            <Input {...register("father_cnic")} value={formatCnic(watch("father_cnic"))} onChange={(event) => setValue("father_cnic", formatCnic(event.target.value), { shouldDirty: true, shouldValidate: true })} placeholder="0000012345678" inputMode="numeric" maxLength={15} autoComplete="new-password" />
          </Field>
          <Field label="Father alive?" required error={errors.father_alive?.message}>
            <div className="flex gap-4 items-center h-10">
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="yes" {...register("father_alive")} required /> Yes</label>
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="no" {...register("father_alive")} required /> No</label>
            </div>
          </Field>
          
          <div className="col-span-full border-t border-outline/50 my-2 pt-4">
            <p className="text-sm font-semibold mb-3">{fatherAlive === "no" ? "Guardian Info" : "Guardian Info (Optional)"}</p>
          </div>
          
          <Field label="Guardian name" required={watch("father_alive") === "no"} error={errors.guardian_name?.message}>
            <Input {...register("guardian_name")} value={watch("guardian_name") ?? ""} onChange={(event) => handleEnglishNameChange("guardian_name", event.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Relationship" required={watch("father_alive") === "no"} error={errors.guardian_relationship?.message}>
            <Input {...register("guardian_relationship")} autoComplete="off" />
          </Field>
          <Field label="Guardian email" error={errors.guardian_email?.message}>
            <Input type="email" {...register("guardian_email")} onChange={(event) => setValue("guardian_email", normalizeEmail(event.target.value), { shouldDirty: true, shouldValidate: true })} autoComplete="new-password" />
          </Field>
          <Field label="Guardian phone" required={watch("father_alive") === "no"} error={errors.guardian_phone?.message}>
            <Input {...register("guardian_phone")} value={formatPakistaniPhone(watch("guardian_phone"))} onChange={(event) => setValue("guardian_phone", formatPakistaniPhone(event.target.value), { shouldDirty: true, shouldValidate: true })} inputMode="numeric" maxLength={12} placeholder="0300-0000000" autoComplete="new-password" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}
