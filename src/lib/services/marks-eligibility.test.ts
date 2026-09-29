import { describe, expect, it } from "vitest";
import { canPrintOfficialResultCard, isResultCardSubjectEligible, isStudentEligibleForAssessmentSubject, summarizeResultCardRows } from "@/lib/services/marks";
import { markEntrySchema } from "@/lib/validation/marks";

const base = {
  studentId: "student-1",
  subjectId: "computer",
  subjectName: "Computer Science",
  gradeName: "Grade 11",
  directStudentIds: new Set(["student-1"])
};

describe("dynamic assessment subject eligibility", () => {
  it("does not let a stale direct row override a custom combination", () => {
    expect(isStudentEligibleForAssessmentSubject({
      ...base,
      studentMajor: "custom:medical",
      combinationOptions: [{ value: "custom:medical", label: "Medical", kind: "custom", subjectIds: ["biology"] }]
    })).toBe(false);
  });

  it("immediately includes a subject added to a custom combination", () => {
    expect(isStudentEligibleForAssessmentSubject({
      ...base,
      directStudentIds: new Set(),
      studentMajor: "custom:ics",
      combinationOptions: [{ value: "custom:ics", label: "ICS", kind: "custom", subjectIds: ["computer"] }]
    })).toBe(true);
  });

  it("uses an edited default-combination mapping as the source of truth", () => {
    expect(isStudentEligibleForAssessmentSubject({
      ...base,
      studentMajor: "pre_engineering",
      combinationOptions: [{ value: "pre_engineering", label: "Pre-Engineering", kind: "default", subjectIds: ["computer"] }]
    })).toBe(true);
  });
});

describe("historical result card subjects", () => {
  it("keeps ninth and tenth session cards stable after a custom combination edit", () => {
    const ninthSubjectHistory = [
      { subject_id: "biology", valid_from: "2025-04-01T00:00:00Z", valid_to: "2026-10-01T00:00:00Z" },
      { subject_id: "computer", valid_from: "2026-10-01T00:00:00Z", valid_to: null }
    ];
    const tenthSubjectHistory = [
      { subject_id: "biology", valid_from: "2026-04-01T00:00:00Z", valid_to: "2026-10-01T00:00:00Z" },
      { subject_id: "computer", valid_from: "2026-10-01T00:00:00Z", valid_to: null }
    ];
    expect(isResultCardSubjectEligible({
      subjectId: "biology", examDate: "2026-02-15", subjectEvidence: ninthSubjectHistory, hasMark: false
    })).toBe(true);
    expect(isResultCardSubjectEligible({
      subjectId: "biology", examDate: "2026-08-15", subjectEvidence: tenthSubjectHistory, hasMark: false
    })).toBe(true);
    expect(isResultCardSubjectEligible({
      subjectId: "computer", examDate: "2026-02-15", subjectEvidence: ninthSubjectHistory, hasMark: false
    })).toBe(false);
    expect(isResultCardSubjectEligible({
      subjectId: "computer", examDate: "2026-08-15", subjectEvidence: tenthSubjectHistory, hasMark: false
    })).toBe(false);
  });

  it("includes a historical subject without marks as a pending row", () => {
    expect(isResultCardSubjectEligible({
      subjectId: "computer", examDate: "2026-08-15", hasMark: false,
      subjectEvidence: [{ subject_id: "computer", valid_from: "2026-04-01", valid_to: null }]
    })).toBe(true);
  });

  it("uses a marked exam as evidence when the legacy subject row is missing", () => {
    const legacy = { subjectId: "biology", examDate: "2026-08-15", subjectEvidence: [] };
    expect(isResultCardSubjectEligible({ ...legacy, hasMark: true })).toBe(true);
    expect(isResultCardSubjectEligible({ ...legacy, hasMark: false })).toBe(false);
  });
});

describe("official result card access", () => {
  const approvedMonthly = { requiresApproval: true, workflowStatus: "approved" as const, examType: "monthly" as const, month: 9 };

  it("gives principals the same approved-card printing capability as student-management staff", () => {
    expect(canPrintOfficialResultCard({ role: "principal", permissions: [] }, approvedMonthly)).toBe(true);
    expect(canPrintOfficialResultCard({ role: "student_staff", permissions: ["results:generate"] }, approvedMonthly)).toBe(true);
  });

  it("does not print unapproved or unsupported assessments", () => {
    expect(canPrintOfficialResultCard({ role: "principal", permissions: [] }, { ...approvedMonthly, workflowStatus: "pending_approval" })).toBe(false);
    expect(canPrintOfficialResultCard({ role: "principal", permissions: [] }, { ...approvedMonthly, examType: "quiz" })).toBe(false);
  });

  it("recovers the month from the exam date for older records and rejects incomplete monthly records", () => {
    expect(canPrintOfficialResultCard(
      { role: "principal", permissions: [] },
      { ...approvedMonthly, month: null, examDate: "2026-09-15" }
    )).toBe(true);
    expect(canPrintOfficialResultCard(
      { role: "principal", permissions: [] },
      { ...approvedMonthly, month: null, examDate: null }
    )).toBe(false);
  });
});

describe("result-card totals", () => {
  it("keeps every required subject in the denominator and suppresses an incomplete final result", () => {
    expect(summarizeResultCardRows([
      { marks_obtained: 75, max_marks: 100 },
      { marks_obtained: null, max_marks: 100 }
    ], true)).toEqual({ incomplete: true, totalObtained: 75, totalMax: 200, percentage: null, overallGrade: "Incomplete" });
  });

  it("counts absence as zero with full maximum marks", () => {
    const result = summarizeResultCardRows([
      { marks_obtained: 80, max_marks: 100 },
      { marks_obtained: 0, max_marks: 100, is_absent: true }
    ], true);
    expect(result.incomplete).toBe(false);
    expect(result.totalObtained).toBe(80);
    expect(result.totalMax).toBe(200);
    expect(result.percentage).toBe(40);
  });

  it("does not issue a final percentage when a subject lacks an approved exam", () => {
    expect(summarizeResultCardRows([{ marks_obtained: 90, max_marks: 100 }], false).percentage).toBeNull();
  });
});

describe("absence validation", () => {
  const exam_id = "00000000-0000-4000-8000-000000000001";
  const student_id = "00000000-0000-4000-8000-000000000002";
  it("accepts an absent student with zero marks", () => {
    expect(markEntrySchema.parse({ exam_id, records: [{ student_id, marks_obtained: 0, is_absent: true }] }).records[0].is_absent).toBe(true);
  });
  it("rejects a positive mark for an absent student", () => {
    expect(markEntrySchema.safeParse({ exam_id, records: [{ student_id, marks_obtained: 5, is_absent: true }] }).success).toBe(false);
  });
});
