"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { assignTeacherClassAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDisplayName } from "@/lib/student-name";
import { canonicalSubjectName, getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";
import { isCustomStudentMajor, isSubjectExcludedForMajor, type StudentCombinationOption } from "@/lib/student-majors";

type SubjectOption = { id: string; name: string };
type MajorSubjectGroup = { value: string; label: string; subjects: SubjectOption[] };
type TeacherAssignment = { teacher_id: string; subject_ids?: string[] };

export function TeacherAssignmentModal({
  classId,
  className,
  teachers,
  subjects,
  assignments = [],
  combinations = [],
  allowedMajors = [],
  gradeName,
  compact = false
}: {
  classId: string;
  className: string;
  teachers: { user_id: string; full_name: string }[];
  subjects: SubjectOption[];
  assignments?: TeacherAssignment[];
  combinations?: StudentCombinationOption[];
  allowedMajors?: string[];
  gradeName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    const assignment = assignments.find((item) => item.teacher_id === teacherId);
    setSelectedSubjectIds(assignment?.subject_ids ?? []);
  }, [assignments, teacherId]);

  const majorSubjectGroups: MajorSubjectGroup[] = combinations
    .filter((combination) => !allowedMajors.length || allowedMajors.includes(combination.value))
    .map((combination) => ({
      value: combination.value,
      label: combination.label,
      subjects: subjects.filter((subject) => isCustomStudentMajor(combination.value)
        ? Boolean(combination.subjectIds?.includes(subject.id))
        : getDefaultSubjectsForGrade(gradeName ?? "")
          .some((defaultSubject) => canonicalSubjectName(defaultSubject.name) === canonicalSubjectName(subject.name))
          && !isSubjectExcludedForMajor(gradeName ?? "", combination.value, subject.name))
    }))
    .filter((group) => group.subjects.length);

  const selectedSubjectNames = useMemo(
    () => subjects.filter((subject) => selectedSubjectIds.includes(subject.id)).map((subject) => subject.name),
    [selectedSubjectIds, subjects]
  );

  function toggleSubject(subjectId: string) {
    setSelectedSubjectIds((current) =>
      current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId]
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("teacher_id", teacherId);
    selectedSubjectIds.forEach((subjectId) => formData.append("subject_id", subjectId));

    startTransition(async () => {
      try {
        await assignTeacherClassAction(formData);
        pushToast(
          selectedSubjectNames.length
            ? `Assigned teacher to ${selectedSubjectNames.join(", ")}.`
            : "Teacher assigned to class.",
          "success"
        );
        setTeacherId("");
        setSelectedSubjectIds([]);
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to assign teacher.");
      }
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="secondary"
        size={compact ? "sm" : "md"}
        className="flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Assign Teacher
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[20px] bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-outline/40 px-6 py-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Assign Teacher</h2>
                <p className="mt-1 text-sm text-muted">{className}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6">
              {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Teacher
                <Select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required>
                  <option value="">Select teacher...</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {formatDisplayName(teacher.full_name)}
                    </option>
                  ))}
                </Select>
              </label>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-ink">Subjects taught in this class</p>
                {subjects.length ? (
                  <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                    {(majorSubjectGroups.length ? majorSubjectGroups.flatMap((group) => group.subjects) : subjects)
                      .filter((subject, index, all) => all.findIndex((candidate) => candidate.id === subject.id) === index)
                      .map((subject) => {
                      const checked = selectedSubjectIds.includes(subject.id);
                      return (
                        <label
                          key={subject.id}
                          className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-3 py-2 text-sm transition ${
                            checked ? "border-primary/40 bg-primary/5" : "border-outline/60 bg-surface-low"
                          }`}
                        >
                          <span className="font-semibold text-ink">{subject.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubject(subject.id)}
                            className="h-4 w-4 accent-primary"
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted">Link subjects to this class first.</p>
                )}
              </div>

              {selectedSubjectNames.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSubjectNames.map((subjectName) => (
                    <Badge key={subjectName} tone="blue">
                      {subjectName}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !teacherId}>
                  {pending ? "Saving..." : "Save assignment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
