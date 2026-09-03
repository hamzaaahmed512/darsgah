"use client";

import dynamic from "next/dynamic";
import { Plus, UserRoundPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StudentFormValues } from "@/lib/validation/students";
import type { StudentCombinationOption } from "@/lib/student-majors";

type ClassOption = {
  id: string;
  name: string;
  grade_name: string;
  section_name: string | null;
  major_count?: number;
  default_major?: string | null;
  allowed_majors?: string[];
};

const StudentForm = dynamic(
  () => import("@/components/students/student-form").then((mod) => mod.StudentForm),
  {
    ssr: false,
    loading: () => <div className="h-80 animate-pulse rounded-[18px] bg-surface-low ring-1 ring-outline/40" />
  }
);

export function StudentFormModal({
  classes,
  combinations,
  onSubmit,
  submitLabel,
  triggerLabel = "Add student",
  initialOpen = false
}: {
  classes: ClassOption[];
  combinations?: StudentCombinationOption[];
  onSubmit: (values: StudentFormValues) => Promise<void | { error?: string }>;
  submitLabel: string;
  triggerLabel?: string;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);

  function close() {
    setOpen(false);
    if (initialOpen) router.replace("/students");
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                  <UserRoundPlus className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-[1.9rem] font-bold text-ink">Add Student</h2>
                  <p className="mt-1 text-sm text-muted">Create the student profile, guardian details, and optional class placement.</p>
                </div>
              </div>
              <button type="button" onClick={close} className="rounded-2xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close student form">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto bg-slate-50/30 p-5 sm:p-6">
              <StudentForm classes={classes} combinations={combinations} onSubmit={onSubmit} submitLabel={submitLabel} onCancel={close} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
