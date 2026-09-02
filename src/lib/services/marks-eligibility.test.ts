import { describe, expect, it } from "vitest";
import { isStudentEligibleForAssessmentSubject } from "@/lib/services/marks";

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
