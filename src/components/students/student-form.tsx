"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studentSchema, type StudentFormValues } from "@/lib/validation/students";

export function StudentForm({
  initialValues,
  classes,
  onSubmit,
  submitLabel
}: {
  initialValues?: Partial<StudentFormValues>;
  classes: Array<{ id: string; name: string; grade_name: string; section_name: string | null }>;
  onSubmit: (values: StudentFormValues) => Promise<void | { error?: string }>;
  submitLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      admission_number: "",
      name_en: "",
      name_ur: "",
      father_name_en: "",
      father_name_ur: "",
      father_phone: "",
      father_cnic: "",
      photo_url: "",
      date_of_birth: "",
      gender: undefined,
      email: "",
      phone: "",
      address: "",
      admission_date: new Date().toISOString().slice(0, 10),
      status: "active",
      class_id: "",
      guardian_name: "",
      guardian_relationship: "",
      guardian_email: "",
      guardian_phone: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      ...initialValues
    }
  });

  function submit(values: StudentFormValues) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await onSubmit(values);
        if (result && result.error) {
          setServerError(result.error);
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
    <form className="grid gap-6" onSubmit={handleSubmit(submit)}>
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
            <Input {...register("admission_number")} />
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
            <Input {...register("name_en")} placeholder="e.g. John Doe" />
          </Field>
          <Field label="Name (Urdu)" error={errors.name_ur?.message}>
            <Input {...register("name_ur")} dir="rtl" placeholder="e.g. جان ڈو" />
          </Field>
          <Field label="Gender" error={errors.gender?.message}>
            <div className="flex gap-4 items-center h-10">
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="male" {...register("gender")} /> Male</label>
              <label className="flex items-center gap-2 text-sm text-ink"><input type="radio" value="female" {...register("gender")} /> Female</label>
            </div>
          </Field>

          <Field label="Date of birth" error={errors.date_of_birth?.message}>
            <Input type="date" {...register("date_of_birth")} />
          </Field>
          <Field label="Admission date" error={errors.admission_date?.message}>
            <Input type="date" {...register("admission_date")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} />
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
          <Field label="Address" error={errors.address?.message}>
            <Textarea {...register("address")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Father & Guardian Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Father's Name (English)" error={errors.father_name_en?.message}>
            <Input {...register("father_name_en")} />
          </Field>
          <Field label="Father's Name (Urdu)" error={errors.father_name_ur?.message}>
            <Input {...register("father_name_ur")} dir="rtl" />
          </Field>
          <Field label="Father's Phone" error={errors.father_phone?.message}>
            <Input {...register("father_phone")} />
          </Field>
          <Field label="Father's CNIC" error={errors.father_cnic?.message}>
            <Input {...register("father_cnic")} placeholder="XXXXX-XXXXXXX-X" />
          </Field>
          
          <div className="col-span-full border-t border-outline/50 my-2 pt-4">
            <p className="text-sm font-semibold mb-3">Legacy Guardian Info (Optional)</p>
          </div>
          
          <Field label="Guardian name" error={errors.guardian_name?.message}>
            <Input {...register("guardian_name")} />
          </Field>
          <Field label="Relationship" error={errors.guardian_relationship?.message}>
            <Input {...register("guardian_relationship")} />
          </Field>
          <Field label="Guardian phone" error={errors.guardian_phone?.message}>
            <Input {...register("guardian_phone")} />
          </Field>
          <Field label="Emergency contact" error={errors.emergency_contact_name?.message}>
            <Input {...register("emergency_contact_name")} />
          </Field>
          <Field label="Emergency phone" error={errors.emergency_contact_phone?.message}>
            <Input {...register("emergency_contact_phone")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}
