"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-field";
import { assignTeacherClassAction } from "@/app/(app)/classes/actions";
import { UserPlus, X } from "lucide-react";

export function TeacherAssignmentModal({
  classId,
  className,
  teachers,
  subjects,
}: {
  classId: string;
  className: string;
  teachers: { user_id: string; full_name: string }[];
  subjects: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm();

  const onSubmit = (data: any) => {
    setError(null);
    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("teacher_id", data.teacher_id);
    if (data.subject_id) formData.append("subject_id", data.subject_id);

    startTransition(async () => {
      try {
        await assignTeacherClassAction(formData);
        reset();
        setOpen(false);
      } catch (err: any) {
        setError(err.message || "Failed to assign teacher.");
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm" className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> Assign Teacher
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-outline/40 px-6 py-4">
              <h2 className="text-xl font-display font-bold">Assign Teacher</h2>
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

              <p className="mb-6 text-sm text-muted">Assigning a teacher to <strong className="text-ink">{className}</strong>.</p>

              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Teacher *</label>
                  <Select {...register("teacher_id", { required: true })}>
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Subject (Optional)</label>
                  <Select {...register("subject_id")}>
                    <option value="">General / Homeroom</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Assigning..." : "Confirm Assignment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
