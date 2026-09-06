"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addClassSubjectAction, linkExistingClassSubjectAction, removeClassSubjectAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { isHighSchoolGrade } from "@/lib/constants/subjectDefaults";
import { canonicalSubjectName } from "@/lib/constants/subjectDefaults";

type ClassSubject = {
  id: string;
  subject_id: string;
  name: string;
  is_elective: boolean;
  is_class_specific: boolean;
};

export function ClassSubjectManager({
  classId,
  gradeName,
  subjects,
  availableSubjects = [],
  allLinkedSubjectIds
}: {
  classId: string;
  gradeName: string;
  subjects: ClassSubject[];
  availableSubjects?: Array<{ id: string; name: string }>;
  allLinkedSubjectIds?: string[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [draft, setDraft] = useState("");
  const [isElective, setIsElective] = useState(false);
  const [existingSubjectId, setExistingSubjectId] = useState("");
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isHighSchool = isHighSchoolGrade(gradeName);
  const linkedIds = new Set(allLinkedSubjectIds ?? subjects.map((subject) => subject.subject_id));
  const linkedNames = new Set(subjects.map((subject) => canonicalSubjectName(subject.name)));
  const unlinkedSubjects = availableSubjects.filter((subject) => !linkedIds.has(subject.id) && !linkedNames.has(canonicalSubjectName(subject.name)));

  function handleLinkExisting() {
    if (!existingSubjectId) return;
    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("subject_id", existingSubjectId);
    startTransition(async () => {
      try {
        await linkExistingClassSubjectAction(formData);
        pushToast("Subject linked to this section.", "success");
        setExistingSubjectId("");
        router.refresh();
      } catch (err: any) {
        pushToast(err?.message ?? "Failed to link subject.", "error");
      }
    });
  }

  function handleAddSubject() {
    const name = draft.trim();
    if (!name) return;

    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("name", name);
    formData.append("is_class_specific", "true");
    formData.append("is_elective", isElective ? "true" : "false");

    startTransition(async () => {
      try {
        await addClassSubjectAction(formData);
        pushToast(`Added ${name} to this class.`, "success");
        setDraft("");
        setIsElective(false);
        router.refresh();
      } catch (err: any) {
        pushToast(err?.message ?? "Failed to add subject.", "error");
      }
    });
  }

  function handleRemoveSubject(classSubjectId: string, subjectName: string) {
    if (!window.confirm(`Remove subject "${subjectName}" from this class? This can affect teacher assignments and student subject enrollments.`)) return;
    setRemovingId(classSubjectId);
    startTransition(async () => {
      try {
        await removeClassSubjectAction(classSubjectId);
        pushToast(`Removed ${subjectName} from this class.`, "success");
        router.refresh();
      } catch (err: any) {
        pushToast(err?.message ?? "Failed to remove subject.", "error");
      } finally {
        setRemovingId(null);
      }
    });
  }

  return (
    <div className="rounded-lg border border-outline/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">Class Subjects</p>
        <span className="text-xs text-muted">{subjects.length} linked</span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {subjects.length ? (
          subjects.map((subject, index) => (
            <div
              key={subject.id}
              className="flex items-center gap-3 rounded-[20px] border border-outline/55 bg-slate-50/70 p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold ${subjectTone(index)}`}>{initials(subject.name)}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{subject.name}</p><p className="mt-0.5 text-xs text-muted">{subject.is_elective ? "Elective" : subject.is_class_specific ? "Section-specific" : "Grade subject"}</p></div>
              <button
                type="button"
                onClick={() => handleRemoveSubject(subject.id, subject.name)}
                disabled={pending && removingId === subject.id}
                className="rounded-md p-1 text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                aria-label={`Remove ${subject.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs italic text-muted">No subjects linked yet.</p>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select value={existingSubjectId} onChange={(event) => setExistingSubjectId(event.target.value)} className="h-9 rounded-lg border border-outline bg-white px-3 text-sm text-ink">
          <option value="">Select an existing subject...</option>
          {unlinkedSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <Button type="button" size="sm" variant="secondary" onClick={handleLinkExisting} disabled={pending || !existingSubjectId}>Add existing</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. Computer Science"
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="secondary" onClick={handleAddSubject} disabled={pending || !draft.trim()}>
          <Plus className="h-4 w-4" />
          Add Unique Subject
        </Button>
      </div>

      {isHighSchool ? (
        <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-muted">
          <input
            type="checkbox"
            checked={isElective}
            onChange={(event) => setIsElective(event.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Mark as elective subject
        </label>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function subjectTone(index: number) {
  return ["border-blue-100 bg-blue-50 text-blue-600", "border-violet-100 bg-violet-50 text-violet-600", "border-cyan-100 bg-cyan-50 text-cyan-600", "border-rose-100 bg-rose-50 text-rose-600"][index % 4];
}
