import { describe, expect, it } from "vitest";
import { canPrintOfficialResultCard, isStudentEligibleForAssessmentSubject } from "@/lib/services/marks";

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

describe("official result card access", () => {
  const approvedMonthly = { requiresApproval: true, workflowStatus: "approved" as const, examType: "monthly" as const };

  it("gives principals the same approved-card printing capability as student-management staff", () => {
    expect(canPrintOfficialResultCard({ role: "principal", permissions: [] }, approvedMonthly)).toBe(true);
    expect(canPrintOfficialResultCard({ role: "student_staff", permissions: ["results:generate"] }, approvedMonthly)).toBe(true);
  });

  it("does not print unapproved or unsupported assessments", () => {
    expect(canPrintOfficialResultCard({ role: "principal", permissions: [] }, { ...approvedMonthly, workflowStatus: "pending_approval" })).toBe(false);
    expect(canPrintOfficialResultCard({ role: "principal", permissions: [] }, { ...approvedMonthly, examType: "quiz" })).toBe(false);
  });
});
