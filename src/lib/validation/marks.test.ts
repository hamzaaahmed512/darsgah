import { describe, expect, it } from "vitest";
import { examSchema, specialExamTypes } from "@/lib/validation/marks";

const base = {
  class_id: "10000000-0000-4000-8000-000000000001",
  subject_id: "20000000-0000-4000-8000-000000000001",
  title: "Assessment",
  term: "2026",
  exam_date: "2026-08-19",
  max_marks: 100
};

describe("exam workflow validation", () => {
  it("defines exactly the four Principal-approved exam types", () => {
    expect(specialExamTypes).toEqual(["monthly", "first_term", "second_term", "third_term"]);
  });

  it("requires a valid month for Monthly exams", () => {
    const monthly = { ...base, assessment_category: "examination", exam_type: "monthly" } as const;

    expect(examSchema.safeParse(monthly).success).toBe(false);
    expect(examSchema.safeParse({ ...monthly, month: 8 }).success).toBe(true);
    expect(examSchema.safeParse({ ...monthly, month: 13 }).success).toBe(false);
  });

  it("clears month on non-Monthly examinations", () => {
    const result = examSchema.safeParse({
      ...base,
      assessment_category: "examination",
      exam_type: "first_term",
      month: 8
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.month).toBeNull();
  });

  it("derives the examination title from its selected type", () => {
    const result = examSchema.safeParse({
      ...base,
      assessment_category: "examination",
      title: "Contradictory title",
      exam_type: "second_term"
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("2nd Term");
  });
});
