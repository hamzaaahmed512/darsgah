"use client";

import { useState } from "react";
import { ChevronDown, GraduationCap, MapPin, Settings, Users } from "lucide-react";
import { AddSectionModal } from "@/components/classes/add-section-modal";
import { Badge } from "@/components/ui/badge";
import { formatGradeSection } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export function ClassGradeGroup({ gradeName, classes, classDetails }: {
  gradeName: string;
  classes: any[];
  classDetails: any;
  subjectsByClass?: any;
  academicData?: any;
  teachers?: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const sortedClasses = [...classes].sort((a, b) => (a.section_name || "").localeCompare(b.section_name || ""));
  const totalStudents = classes.reduce((sum, cls) => sum + (classDetails.studentsByClass[cls.id] || 0), 0);
  const gradeId = sortedClasses[0]?.grade_id;

  return (
    <div className="overflow-hidden rounded-[18px] bg-white shadow-card ring-1 ring-outline/70">
      <button type="button" className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-surface-low md:grid-cols-[minmax(0,1fr)_auto] md:items-center" onClick={() => setExpanded((value) => !value)}>
        <div className="min-w-0">
          <Badge tone="blue">{gradeName}</Badge>
          <h3 className="mt-2 truncate font-display text-lg font-semibold text-ink">{gradeName === "Unassigned" ? "Unassigned Grade" : gradeName}</h3>
          <p className="mt-1 text-sm text-muted">{classes.length} {classes.length === 1 ? "Section" : "Sections"} / {totalStudents} Students</p>
        </div>
        <ChevronDown className={`h-5 w-5 justify-self-end text-muted transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="border-t border-outline/60 bg-surface-low/30 p-5">
          <div className="grid gap-3">
            {sortedClasses.map((cls) => {
              const studentCount = classDetails.studentsByClass[cls.id] ?? 0;
              return (
                <div key={cls.id} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-outline/40 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-lg font-semibold text-ink">{formatGradeSection(gradeName, cls.section_name)}</h4>
                      <Badge tone="gray">{cls.academic_year_name}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                      <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {cls.head_teacher_name || "No head teacher"}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {studentCount} Students</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {cls.room || "Room not set"}</span>
                    </div>
                  </div>
                  <ButtonLink href={`/classes/${cls.id}`} size="sm"><Settings className="h-4 w-4" /> Manage section</ButtonLink>
                </div>
              );
            })}
          </div>
          {gradeId ? <div className="mt-4 flex justify-end"><AddSectionModal gradeId={gradeId} gradeName={gradeName} /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
