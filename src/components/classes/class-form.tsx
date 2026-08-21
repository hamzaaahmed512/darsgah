"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";
import { 
  createClassAction, 
  updateClassAction, 
  assignTeacherClassAction,
  createGradeAction,
  createSectionAction,
  createAcademicYearAction
} from "@/app/(app)/classes/actions";
import { RemoveAssignmentButton } from "@/components/classes/class-actions";
import { Badge } from "@/components/ui/badge";
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
    head_teacher_id: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [assignPending, startAssignTransition] = useTransition();
  const [assignError, setAssignError] = useState<string | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Inline creation states
  const [creatingGrade, setCreatingGrade] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingYear, setCreatingYear] = useState(false);
  const [inlinePending, startInlineTransition] = useTransition();

  const editing = Boolean(initialClass);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: initialClass
      ? {
          name: initialClass.name,
          grade_id: initialClass.grade_id,
          section_id: initialClass.section_id ?? "",
          academic_year_id: initialClass.academic_year_id,
          room: initialClass.room ?? "",
          head_teacher_id: initialClass.head_teacher_id ?? ""
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
    if (data.head_teacher_id) formData.append("head_teacher_id", data.head_teacher_id);

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
    selectedSubjectIds.forEach((subjectId) => formData.append("subject_id", subjectId));

    startAssignTransition(async () => {
      try {
        await assignTeacherClassAction(formData);
        form.reset();
        setSelectedSubjectIds([]);
      } catch (err: any) {
        setAssignError(err.message || "Failed to assign teacher.");
      }
    });
  };

  const handleInlineGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startInlineTransition(async () => {
      try {
        const res = await createGradeAction(formData);
        if (res?.id) setValue("grade_id", res.id);
        setCreatingGrade(false);
      } catch (err: any) {
        alert(err.message || "Failed to create grade");
      }
    });
  };

  const handleInlineSection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startInlineTransition(async () => {
      try {
        const res = await createSectionAction(formData);
        if (res?.id) setValue("section_id", res.id);
        setCreatingSection(false);
      } catch (err: any) {
        alert(err.message || "Failed to create section");
      }
    });
  };

  const handleInlineYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Automatically generate dates for the newly created academic year based on current year
    const year = new Date().getFullYear();
    formData.append("starts_on", `${year}-09-01`);
    formData.append("ends_on", `${year + 1}-06-30`);
    formData.append("is_active", "true");

    startInlineTransition(async () => {
      try {
        // Assume createAcademicYearAction might not return ID instantly since settings.ts uses upsert without select for some things,
        // Wait, we didn't update createAcademicYear to return ID in settings.ts! 
        // We'll just wait for it and then let the user select it from the refreshed list.
        await createAcademicYearAction(formData);
        setCreatingYear(false);
      } catch (err: any) {
        alert(err.message || "Failed to create academic year");
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
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-semibold text-ink">Grade *</label>
                        {!creatingGrade && (
                          <button type="button" onClick={() => setCreatingGrade(true)} className="text-xs font-semibold text-primary hover:underline">
                            + Add
                          </button>
                        )}
                      </div>
                      {creatingGrade ? (
                        <div className="rounded-md border border-outline/40 bg-surface-low p-2">
                          <Input form="inline-grade-form" name="name" placeholder="e.g. Grade 1" required className="mb-2 h-8 text-sm" />
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" className="h-7 w-full text-xs" onClick={() => setCreatingGrade(false)}>Cancel</Button>
                            <Button type="submit" form="inline-grade-form" size="sm" className="h-7 w-full text-xs" disabled={inlinePending}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <Select {...register("grade_id", { required: true })}>
                          <option value="" disabled={grades.length === 0}>
                            {grades.length === 0 ? "No grades found. Create one first." : "Select Grade"}
                          </option>
                          {grades.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </Select>
                      )}
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-semibold text-ink">Section</label>
                        {!creatingSection && (
                          <button type="button" onClick={() => setCreatingSection(true)} className="text-xs font-semibold text-primary hover:underline">
                            + Add
                          </button>
                        )}
                      </div>
                      {creatingSection ? (
                        <div className="rounded-md border border-outline/40 bg-surface-low p-2">
                          <Input form="inline-section-form" name="name" placeholder="e.g. A" required className="mb-2 h-8 text-sm" />
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" className="h-7 w-full text-xs" onClick={() => setCreatingSection(false)}>Cancel</Button>
                            <Button type="submit" form="inline-section-form" size="sm" className="h-7 w-full text-xs" disabled={inlinePending}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <Select {...register("section_id")}>
                          <option value="">None / Unassigned</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </Select>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-semibold text-ink">Academic Year *</label>
                        {!creatingYear && (
                          <button type="button" onClick={() => setCreatingYear(true)} className="text-xs font-semibold text-primary hover:underline">
                            + Add
                          </button>
                        )}
                      </div>
                      {creatingYear ? (
                        <div className="rounded-md border border-outline/40 bg-surface-low p-2">
                          <Input form="inline-year-form" name="name" placeholder={`e.g. ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`} required className="mb-2 h-8 text-sm" />
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" className="h-7 w-full text-xs" onClick={() => setCreatingYear(false)}>Cancel</Button>
                            <Button type="submit" form="inline-year-form" size="sm" className="h-7 w-full text-xs" disabled={inlinePending}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <Select {...register("academic_year_id", { required: true })}>
                          <option value="" disabled={academicYears.length === 0}>
                            {academicYears.length === 0 ? "No active years found. Create one first." : "Select Year"}
                          </option>
                          {academicYears.map((y) => (
                            <option key={y.id} value={y.id}>{y.name}</option>
                          ))}
                        </Select>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-ink">Head Teacher</label>
                      <Select {...register("head_teacher_id")}>
                        <option value="">Assign later</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.user_id} value={teacher.user_id}>{teacher.full_name}</option>
                        ))}
                      </Select>
                      {!teachers.length ? (
                        <p className="mt-1 text-xs text-muted">No teachers yet. You can assign a head teacher later.</p>
                      ) : null}
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
                        <li key={teacher.teacher_id ?? teacher.id} className="flex items-center justify-between rounded-[12px] bg-surface-low px-4 py-3 text-sm">
                          <div>
                            <p className="font-semibold text-ink">{teacher.teacher_name}</p>
                            {teacher.subject_names?.length ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {teacher.subject_names.map((subjectName: string) => (
                                  <Badge key={subjectName} tone="gray">{subjectName}</Badge>
                                ))}
                              </div>
                            ) : teacher.subject_name ? <p className="text-xs text-muted">{teacher.subject_name}</p> : null}
                          </div>
                          {(teacher.assignment_ids?.length ? teacher.assignment_ids : [teacher.id]).slice(0, 1).map((assignmentId: string) => (
                            <RemoveAssignmentButton key={assignmentId} assignmentId={assignmentId} />
                          ))}
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
                    <div className="grid gap-3">
                      <input type="hidden" name="class_id" value={initialClass.id} />
                      <div>
                        <Select name="teacher_id" required>
                          <option value="">Select Teacher</option>
                          {teachers.map((t) => (
                            <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <p className="text-xs font-semibold text-muted">Subjects (select one or more)</p>
                        {subjects.length ? subjects.map((subject) => {
                          const checked = selectedSubjectIds.includes(subject.id);
                          return (
                            <label
                              key={subject.id}
                              className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-3 py-2 text-sm ${
                                checked ? "border-primary/40 bg-primary/5" : "border-outline/60"
                              }`}
                            >
                              <span>{subject.name}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedSubjectIds((current) =>
                                    current.includes(subject.id)
                                      ? current.filter((id) => id !== subject.id)
                                      : [...current, subject.id]
                                  );
                                }}
                                className="h-4 w-4 accent-primary"
                              />
                            </label>
                          );
                        }) : (
                          <p className="text-xs italic text-muted">No subjects available yet.</p>
                        )}
                      </div>
                      <div className="flex justify-end">
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
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending || inlinePending}>
                Cancel
              </Button>
              <Button type="submit" form="class-details-form" disabled={pending || inlinePending}>
                {pending ? "Saving..." : editing ? "Save Class" : "Create Class"}
              </Button>
            </div>

            {/* Hidden forms for inline actions */}
            <form id="inline-grade-form" onSubmit={handleInlineGrade} className="hidden"></form>
            <form id="inline-section-form" onSubmit={handleInlineSection} className="hidden"></form>
            <form id="inline-year-form" onSubmit={handleInlineYear} className="hidden"></form>
          </div>
        </div>
      )}
    </>
  );
}
