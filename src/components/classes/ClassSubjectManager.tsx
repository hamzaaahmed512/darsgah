"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addClassSubjectAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

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
  subjects
}: {
  classId: string;
  gradeName: string;
  subjects: ClassSubject[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [draft, setDraft] = useState("");
  const [isElective, setIsElective] = useState(false);
  const [pending, startTransition] = useTransition();

  const isHighSchool = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"].includes(gradeName);

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
        router.refresh();
      } catch (err: any) {
        pushToast(err?.message ?? "Failed to add subject.", "error");
      }
    });
  }

  return (
    <div className="rounded-lg border border-outline/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">Class Subjects</p>
        <span className="text-xs text-muted">{subjects.length} linked</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {subjects.length ? (
          subjects.map((subject) => (
            <Badge key={subject.id} tone={subject.is_class_specific ? "blue" : "gray"}>
              {subject.name}
              {subject.is_elective ? " · Elective" : ""}
            </Badge>
          ))
        ) : (
          <p className="text-xs italic text-muted">No subjects linked yet.</p>
        )}
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
