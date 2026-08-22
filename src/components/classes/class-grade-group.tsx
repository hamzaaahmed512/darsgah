"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, MapPin, CalendarCheck, Users, GraduationCap } from "lucide-react";
import { Select } from "@/components/ui/form-field";

// Component imports
import { ClassSubjectManager } from "@/components/classes/ClassSubjectManager";
import { ClassStudentRosterModal } from "@/components/classes/ClassStudentRosterModal";
import { TeacherAssignmentModal } from "@/components/classes/TeacherAssignmentModal";
import { ClassFormModal } from "@/components/classes/class-form";
import { DeleteClassButton } from "@/components/classes/class-actions";

export function ClassGradeGroup({
  gradeName,
  classes,
  classDetails,
  subjectsByClass,
  academicData,
  teachers
}: {
  gradeName: string;
  classes: any[];
  classDetails: any;
  subjectsByClass: any;
  academicData: any;
  teachers: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  // Sort classes by section name to ensure A, B, C etc. are in order
  const sortedClasses = [...classes].sort((a, b) => {
    const aName = a.section_name || "";
    const bName = b.section_name || "";
    return aName.localeCompare(bName);
  });
  
  const [selectedClassId, setSelectedClassId] = useState<string>(sortedClasses[0]?.id || "");

  const totalSections = classes.length;
  const totalStudents = classes.reduce((sum, cls) => sum + (classDetails.studentsByClass[cls.id] || 0), 0);

  const selectedCls = sortedClasses.find((c) => c.id === selectedClassId) || sortedClasses[0];

  return (
    <div className="group overflow-hidden rounded-[18px] bg-white shadow-card ring-1 ring-outline/70 transition-all">
      <div 
        className="grid cursor-pointer gap-4 px-5 py-4 transition hover:bg-surface-low md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
              <Badge tone="blue">{gradeName}</Badge>
          </div>
          <h3 className="truncate font-display text-lg font-semibold text-ink">{gradeName === "Unassigned" ? "Unassigned Grade" : gradeName}</h3>
          <p className="mt-1 text-sm text-muted">{totalSections} {totalSections === 1 ? "Section" : "Sections"} / {totalStudents} Students</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <ChevronDown className={`h-5 w-5 text-muted transition duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-outline/60 p-5 bg-surface-low/30">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-semibold text-ink shrink-0">Select Section:</label>
            <div className="w-full sm:w-64">
              <Select 
                value={selectedClassId} 
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {sortedClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.section_name ? `Section ${cls.section_name}` : "Main Section"} {cls.academic_year_name ? `(${cls.academic_year_name})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {selectedCls && (
            <SectionDetails 
              cls={selectedCls}
              classDetails={classDetails}
              subjectsByClass={subjectsByClass}
              academicData={academicData}
              teachers={teachers}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SectionDetails({ cls, classDetails, subjectsByClass, academicData, teachers }: any) {
  const assignedTeachers = classDetails.teachersByClass[cls.id] ?? [];
  const classSubjects = subjectsByClass[cls.id] ?? [];
  const attendance = classDetails.attendanceByClass[cls.id];
  const studentCount = classDetails.studentsByClass[cls.id] ?? 0;
  
  const totalRecords = attendance ? attendance.present + attendance.absent + attendance.late + attendance.excused : 0;
  const attendanceRate = totalRecords > 0
    ? Math.round(((attendance.present + attendance.late) / totalRecords) * 100)
    : null;

  return (
    <div className="grid gap-5 bg-white rounded-xl border border-outline/40 p-4">
      <div className="flex items-center justify-between border-b border-outline/40 pb-3">
         <h4 className="font-display font-semibold text-lg">{cls.name}</h4>
         <Badge tone="gray">{cls.academic_year_name}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={<MapPin className="h-4 w-4" />} label="Room" value={cls.room ?? "Not set"} />
        <InfoTile icon={<CalendarCheck className="h-4 w-4" />} label="Attendance Rate" value={attendanceRate !== null ? `${attendanceRate}%` : "No records yet"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
        <ClassSubjectManager classId={cls.id} gradeName={cls.grade_name} subjects={classSubjects} />

        <div className="rounded-lg border border-outline/40 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold text-muted">
              <Users className="h-4 w-4" /> Assigned Faculty ({assignedTeachers.length + (cls.head_teacher_id ? 1 : 0)})
            </span>
          </div>
          <ul className="space-y-1.5 pr-1">
            {cls.head_teacher_id ? (
              <li className="flex items-center justify-between gap-2 rounded-md bg-primary-soft px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{cls.head_teacher_name}</p>
                  <p className="truncate text-xs font-semibold text-primary">Head Teacher</p>
                </div>
              </li>
            ) : null}
            
            {assignedTeachers.map((teacher: any) => (
              <li key={teacher.teacher_id} className="flex items-center justify-between gap-2 rounded-md bg-surface-low px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{teacher.teacher_name}</p>
                  {teacher.subject_names.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {teacher.subject_names.map((subjectName: string) => (
                        <Badge key={subjectName} tone="gray">{subjectName}</Badge>
                      ))}
                    </div>
                  ) : teacher.subject_name ? (
                    <p className="truncate text-xs text-muted">{teacher.subject_name}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {!cls.head_teacher_id && assignedTeachers.length === 0 && (
            <p className="mt-2 text-xs italic text-muted">No faculty assigned.</p>
          )}
        </div>

        <div className="rounded-lg border border-outline/40 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold text-muted">
              <GraduationCap className="h-4 w-4" /> Students ({studentCount})
            </span>
          </div>
          <p className="text-xs text-muted">Manage enrollments and elective tracks from the roster.</p>
          <ClassStudentRosterModal
            classId={cls.id}
            className={cls.name}
            gradeName={cls.grade_name}
            studentCount={studentCount}
          />
          <Link href={`/students?classId=${cls.id}`} className="mt-2 inline-flex text-xs font-semibold text-muted hover:text-primary hover:underline">
            Open full student management
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-outline/40 pt-4">
        <TeacherAssignmentModal
          classId={cls.id}
          className={cls.name}
          teachers={teachers}
          subjects={classSubjects.map((subject: any) => ({ id: subject.subject_id, name: subject.name }))}
          compact
        />
        <ClassFormModal
          grades={academicData.grades}
          sections={academicData.sections}
          academicYears={academicData.years}
          teachers={teachers}
          subjects={classSubjects.map((subject: any) => ({ id: subject.subject_id, name: subject.name }))}
          assignedTeachers={assignedTeachers}
          initialClass={{
            id: cls.id,
            name: cls.name,
            grade_id: cls.grade_id,
            section_id: cls.section_id,
            academic_year_id: cls.academic_year_id,
            room: cls.room,
            head_teacher_id: cls.head_teacher_id
          }}
        />
        <DeleteClassButton classId={cls.id} className={cls.name} />
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm">
      <div className="mb-1 flex items-center gap-1.5 text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="truncate text-lg font-bold text-ink">{value}</p>
      {hint ? <p className="truncate text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
