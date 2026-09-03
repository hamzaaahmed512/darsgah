"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Settings, UserRound, Users } from "lucide-react";
import { AddSectionModal } from "@/components/classes/add-section-modal";
import { Badge } from "@/components/ui/badge";
import { formatGradeSection } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export function ClassGradeGroup({ gradeName, classes, classDetails, defaultExpanded = false }: {
  gradeName: string;
  classes: any[];
  classDetails: any;
  defaultExpanded?: boolean;
  subjectsByClass?: any;
  academicData?: any;
  teachers?: any[];
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sortedClasses = [...classes].sort((a, b) => (a.section_name || "").localeCompare(b.section_name || ""));
  const totalStudents = classes.reduce((sum, cls) => sum + (classDetails.studentsByClass[cls.id] || 0), 0);
  const gradeId = sortedClasses[0]?.grade_id;

  return (
    <div className="overflow-hidden rounded-[24px] border border-outline/70 bg-white shadow-card">
      <button type="button" className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-surface-low/50 md:grid-cols-[minmax(0,1fr)_auto] md:items-center" onClick={() => setExpanded((value) => !value)}>
        <div className="min-w-0">
          <h3 className="truncate font-display text-[1.65rem] font-bold text-ink">{gradeName === "Unassigned" ? "Unassigned Grade" : gradeName}</h3>
          <p className="mt-1.5 text-sm text-muted">{classes.length} {classes.length === 1 ? "Section" : "Sections"} • {totalStudents} Students</p>
        </div>
        <ChevronDown className={`h-5 w-5 justify-self-end text-muted transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="border-t border-outline/60 bg-white p-4 pt-0">
          <div className="grid gap-3">
            {sortedClasses.map((cls) => {
              const studentCount = classDetails.studentsByClass[cls.id] ?? 0;
              return (
                <div key={cls.id} className="flex flex-col items-start gap-4 rounded-[22px] border border-outline/55 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-xl font-bold ${getSectionToneClasses(`${gradeName}-${cls.section_name ?? cls.name}`)}`}>
                      {(cls.section_name ?? cls.name).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-[1.35rem] font-bold text-ink">{formatGradeSection(gradeName, cls.section_name)}</h4>
                        <Badge tone="gray" className="rounded-xl px-3 py-1 text-[11px] font-semibold">{cls.academic_year_name}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                        <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {cls.head_teacher_name || "No head teacher"}</span>
                        <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {studentCount} {studentCount === 1 ? "Student" : "Students"}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {cls.room || "Room not set"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                    <ButtonLink href={`/classes/${cls.id}`} size="sm" variant="secondary" className="min-h-10 rounded-xl px-4 text-sm text-primary">
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

function getSectionToneClasses(value: string) {
  const tones = [
    "border-blue-100 bg-blue-50 text-blue-600",
    "border-indigo-100 bg-indigo-50 text-indigo-600",
    "border-amber-100 bg-amber-50 text-amber-600",
    "border-emerald-100 bg-emerald-50 text-emerald-600"
  ];
  const hash = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
