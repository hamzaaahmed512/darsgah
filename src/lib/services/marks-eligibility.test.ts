import { describe, expect, it } from "vitest";
import { canPrintOfficialResultCard, isResultCardSubjectEligible, isStudentEligibleForAssessmentSubject } from "@/lib/services/marks";

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
  it("uses the session combination even when a stale direct enrollment exists", () => {
    expect(isResultCardSubjectEligible({
      major: "biology", subjectId: "computer", subjectName: "Computer Science", gradeName: "Grade 9",
      enrolledSubjectIds: new Set(["computer"]), hasMark: true,
      combinationOptions: [{ value: "biology", label: "Biology", kind: "default", subjectIds: ["biology"] }]
    })).toBe(false);
  });

  it("includes a combination subject without marks as a pending row", () => {
    expect(isResultCardSubjectEligible({
      major: "computer", subjectId: "computer", subjectName: "Computer Science", gradeName: "Grade 10",
      enrolledSubjectIds: new Set(), hasMark: false,
      combinationOptions: [{ value: "computer", label: "Computer", kind: "default", subjectIds: ["computer"] }]
    })).toBe(true);
  });

  it("uses historical subject enrollment or a mark when the legacy combination is missing", () => {
    const legacy = { major: null, subjectId: "biology", subjectName: "Biology", gradeName: "Grade 11", combinationOptions: [] };
    expect(isResultCardSubjectEligible({ ...legacy, enrolledSubjectIds: new Set(["biology"]), hasMark: false })).toBe(true);
    expect(isResultCardSubjectEligible({ ...legacy, enrolledSubjectIds: new Set(), hasMark: true })).toBe(true);
    expect(isResultCardSubjectEligible({ ...legacy, enrolledSubjectIds: new Set(), hasMark: false })).toBe(false);
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
