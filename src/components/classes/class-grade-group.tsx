"use client";

import { ChevronDown, GraduationCap, Layers3, MapPin, Settings, UserRound, Users } from "lucide-react";
import { AddSectionModal } from "@/components/classes/add-section-modal";
import { Badge } from "@/components/ui/badge";
import { formatGradeSection } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export function ClassGradeGroup({ gradeName, classes, classDetails, expanded, onExpandedChange }: {
  gradeName: string;
  classes: any[];
  classDetails: any;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  subjectsByClass?: any;
  academicData?: any;
  teachers?: any[];
}) {
  const sortedClasses = [...classes].sort((a, b) => (a.section_name || "").localeCompare(b.section_name || ""));
  const totalStudents = classes.reduce((sum, cls) => sum + (classDetails.studentsByClass[cls.id] || 0), 0);
  const gradeId = sortedClasses[0]?.grade_id;

  return (
    <div className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_8px_25px_rgba(37,99,235,0.04)]">
      <div className="class-grade-header flex items-center gap-3 bg-gradient-to-r from-blue-50/60 via-white to-white px-5 py-4 transition hover:bg-blue-50/80">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600">
          <Layers3 className="h-6 w-6" aria-hidden="true" />
        </span>
        <button type="button" className="class-grade-toggle min-w-0 flex-1 text-left" onClick={() => onExpandedChange(!expanded)}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-display text-[1.55rem] font-bold text-ink">{gradeName === "Unassigned" ? "Unassigned Grade" : gradeName}</h3><span className="rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">{classes.length} {classes.length === 1 ? "Section" : "Sections"}</span></div>
            <p className="mt-1.5 text-sm text-muted">{totalStudents} students across this grade</p>
          </div>
        </button>
        {gradeId ? <ButtonLink href={`/classes/grades/${gradeId}`} size="sm" variant="secondary" className="class-grade-manage min-h-10 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm text-primary"><Layers3 className="h-4 w-4" /> Manage Grade</ButtonLink> : null}
        <button type="button" onClick={() => onExpandedChange(!expanded)} className="class-grade-expand rounded-xl p-2 text-muted transition hover:bg-surface-low" aria-label={expanded ? "Collapse grade" : "Expand grade"}><ChevronDown className={`h-5 w-5 transition ${expanded ? "rotate-180" : ""}`} /></button>
      </div>

      {expanded ? (
        <div className="border-t border-blue-100 bg-slate-50/30 p-4">
          <div className="grid gap-3">
            {sortedClasses.map((cls) => {
              const studentCount = classDetails.studentsByClass[cls.id] ?? 0;
              return (
                <div key={cls.id} className="flex flex-col items-start gap-4 rounded-[18px] border border-blue-100 bg-white p-4 shadow-[0_8px_20px_rgba(37,99,235,0.04)] transition hover:border-blue-200 hover:bg-blue-50/25 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                      <GraduationCap className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-[1.35rem] font-bold text-ink">{formatGradeSection(gradeName, cls.section_name)}</h4>
                        <Badge tone="blue" className="rounded-lg px-2.5 py-1 text-[11px] font-semibold">{cls.academic_year_name}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                        <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {cls.head_teacher_name || "No head teacher"}</span>
                        <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {studentCount} {studentCount === 1 ? "Student" : "Students"}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {cls.room ? `Room ${cls.room}` : "Room not set"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                      <ButtonLink href={`/classes/${cls.id}`} size="sm" variant="secondary" className="min-h-10 whitespace-nowrap rounded-xl px-4 text-sm text-primary">
                      <Settings className="h-4 w-4" /> Manage Section
                    </ButtonLink>
                  </div>
                </div>
              );
            })}
          </div>
          {gradeId ? (
            <div className="mt-3">
              <AddSectionCard gradeId={gradeId} gradeName={gradeName} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddSectionCard({ gradeId, gradeName }: { gradeId: string; gradeName: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-outline/70 bg-white px-4 py-2.5">
      <AddSectionModal
        gradeId={gradeId}
        gradeName={gradeName}
        triggerClassName="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-transparent px-4 text-sm font-semibold text-primary hover:bg-primary-soft/40"
      />
    </div>
  );
}
