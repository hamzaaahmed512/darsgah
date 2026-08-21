"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GraduationCap, X } from "lucide-react";
import { getClassStudentRosterAction } from "@/app/(app)/classes/actions";
import { StudentElectiveToggle } from "@/components/subjects/StudentElectiveToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { isHighSchoolGrade } from "@/lib/constants/subjectDefaults";

type RosterStudent = {
  id: string;
  name: string;
  admission_number: string | null;
};

type ElectiveOption = {
  id: string;
  name: string;
};

export function ClassStudentRosterModal({
  classId,
  className,
  gradeName,
  studentCount
}: {
  classId: string;
  className: string;
  gradeName: string;
  studentCount: number;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [electiveOptions, setElectiveOptions] = useState<ElectiveOption[]>([]);
  const [studentElectiveByStudentId, setStudentElectiveByStudentId] = useState<Record<string, string | null>>({});

  const showElectives = isHighSchoolGrade(gradeName);

  function handleOpen() {
    setOpen(true);
    setLoading(true);
    startTransition(async () => {
      try {
        const data = await getClassStudentRosterAction(classId);
        setRoster(data.roster);
        setElectiveOptions(data.electiveOptions);
        setStudentElectiveByStudentId(data.studentElectiveByStudentId);
      } catch (err: any) {
        pushToast(err?.message ?? "Failed to load student roster.", "error");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    });
  }

  function handleClose() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
      >
        View student roster ({studentCount})
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-outline/40 px-6 py-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Student Roster</h2>
                <p className="mt-1 text-sm text-muted">{className}</p>
              </div>
              <button type="button" onClick={handleClose} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {loading || pending ? (
                <p className="text-sm text-muted">Loading roster...</p>
              ) : !roster.length ? (
                <div className="rounded-[12px] border border-outline/60 bg-surface-low px-4 py-8 text-center">
                  <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted" />
                  <p className="text-sm font-semibold text-ink">No active students</p>
                  <p className="mt-1 text-xs text-muted">Enroll students in this class from Student Management.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {showElectives && electiveOptions.length ? (
                    <p className="mb-2 text-xs text-muted">
                      Assign each student to their elective track using the dropdown.
                    </p>
                  ) : null}
                  {roster.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between gap-4 rounded-[12px] border border-outline/60 bg-surface-low px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{student.name}</p>
                        <p className="text-xs text-muted">
                          Admission: {student.admission_number ?? "—"}
                        </p>
                      </div>
                      {showElectives && electiveOptions.length ? (
                        <StudentElectiveToggle
                          classId={classId}
                          studentId={student.id}
                          electiveOptions={electiveOptions}
                          currentSubjectId={studentElectiveByStudentId[student.id] ?? null}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-outline/40 px-6 py-4">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
