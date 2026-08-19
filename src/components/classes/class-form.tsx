"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import { createClassAction, updateClassAction, assignTeacherClassAction } from "@/app/(app)/classes/actions";
import { RemoveAssignmentButton } from "@/components/classes/class-actions";
import { Pencil, Plus, X } from "lucide-react";

export function ClassFormModal({
  grades,
  sections,
  academicYears,
  teachers,
  subjects = [],
  assignedTeachers = [],
  initialClass,
}: {
  grades: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  academicYears: { id: string; name: string }[];
  teachers: { user_id: string; full_name: string }[];
  subjects?: { id: string; name: string }[];
  assignedTeachers?: any[];
  initialClass?: {
    id: string;
    name: string;
    grade_id: string;
    section_id: string | null;
    academic_year_id: string;
    room: string | null;
    head_teacher_id: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [assignPending, startAssignTransition] = useTransition();
  const [assignError, setAssignError] = useState<string | null>(null);

  const editing = Boolean(initialClass);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: initialClass
      ? {
          name: initialClass.name,
          grade_id: initialClass.grade_id,
          section_id: initialClass.section_id ?? "",
          academic_year_id: initialClass.academic_year_id,
          room: initialClass.room ?? "",
          head_teacher_id: initialClass.head_teacher_id
        }
      : {}
  });

  const onSubmitClass = (data: any) => {
    setError(null);
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("grade_id", data.grade_id);
    if (data.section_id) formData.append("section_id", data.section_id);
    formData.append("academic_year_id", data.academic_year_id);
    if (data.room) formData.append("room", data.room);
    formData.append("head_teacher_id", data.head_teacher_id);

    startTransition(async () => {
      try {
        if (initialClass) await updateClassAction(initialClass.id, formData);
        else await createClassAction(formData);
        reset();
        setOpen(false);
      } catch (err: any) {
        setError(err.message || "Failed to save class.");
      }
    });
  };

  const handleAssignTeacher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAssignError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startAssignTransition(async () => {
      try {
        await assignTeacherClassAction(formData);
        form.reset();
      } catch (err: any) {
        setAssignError(err.message || "Failed to assign teacher.");
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant={editing ? "secondary" : "primary"} size={editing ? "sm" : "md"} className="flex items-center gap-2">
        {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {editing ? "Edit" : "Add Class"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-outline/40 px-6 py-4">
              <h2 className="text-xl font-display font-bold">{editing ? "Edit Class" : "Create New Class"}</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <section className="mb-6">
                <h3 className="mb-4 text-sm font-bold text-ink">Class Details</h3>
                <form id="class-details-form" onSubmit={handleSubmit(onSubmitClass)}>
                  {error && (
                    <div className="mb-4 rounded-md bg-danger-soft p-3 text-sm font-semibold text-danger">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Class Name *</label>
                      <Input {...register("name", { required: true })} placeholder="e.g. 10th Grade Math (A)" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Grade *</label>
                      <Select {...register("grade_id", { required: true })}>
                        <option value="">Select Grade</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Section</label>
                      <Select {...register("section_id")}>
                        <option value="">None / Unassigned</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Academic Year *</label>
                      <Select {...register("academic_year_id", { required: true })}>
                        <option value="">Select Year</option>
                        {academicYears.map((y) => (
                          <option key={y.id} value={y.id}>{y.name}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Head Teacher *</label>
                      <Select {...register("head_teacher_id", { required: true })}>
                        <option value="">Select Head Teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.user_id} value={teacher.user_id}>{teacher.full_name}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Room Number</label>
                      <Input {...register("room")} placeholder="e.g. Room 101" />
                    </div>
                  </div>
                </form>
              </section>

              {editing && initialClass && (
                <section className="mt-8 border-t border-outline/40 pt-8">
                  <h3 className="mb-4 text-sm font-bold text-ink">Assigned Faculty</h3>
                  
                  {assignedTeachers && assignedTeachers.length > 0 ? (
                    <ul className="mb-6 space-y-2">
                      {assignedTeachers.map((teacher) => (
                        <li key={teacher.id} className="flex items-center justify-between rounded-[12px] bg-surface-low px-4 py-3 text-sm">
                          <div>
                            <p className="font-semibold text-ink">{teacher.teacher_name}</p>
                            {teacher.subject_name ? <p className="text-xs text-muted">{teacher.subject_name}</p> : null}
                          </div>
                          <RemoveAssignmentButton assignmentId={teacher.id} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-6 text-sm italic text-muted">No additional teachers assigned yet.</p>
                  )}

                  <form onSubmit={handleAssignTeacher} className="rounded-xl border border-outline/40 bg-white p-4">
                    <h4 className="mb-3 text-sm font-semibold text-ink">Assign Additional Teacher</h4>
                    {assignError && (
                      <div className="mb-3 rounded-md bg-danger-soft p-2 text-xs font-semibold text-danger">
                        {assignError}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="class_id" value={initialClass.id} />
                      <div>
                        <Select name="teacher_id" required>
                          <option value="">Select Teacher</option>
                          {teachers.map((t) => (
                            <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Select name="subject_id">
                          <option value="">General / Homeroom</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex justify-end sm:col-span-2">
                        <Button type="submit" variant="secondary" size="sm" disabled={assignPending}>
                          {assignPending ? "Assigning..." : "Assign Teacher"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </section>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-outline/40 px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" form="class-details-form" disabled={pending}>
                {pending ? "Saving..." : editing ? "Save Class" : "Create Class"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
