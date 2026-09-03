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
    expect(examSchema.safeParse({ ...base, exam_type: "monthly" }).success).toBe(false);
    expect(examSchema.safeParse({ ...base, exam_type: "monthly", month: 8 }).success).toBe(true);
    expect(examSchema.safeParse({ ...base, exam_type: "monthly", month: 13 }).success).toBe(false);
  });

  it("rejects month on non-Monthly exams", () => {
    expect(examSchema.safeParse({ ...base, exam_type: "first_term", month: 8 }).success).toBe(false);
    expect(examSchema.safeParse({ ...base, exam_type: "first_term" }).success).toBe(true);
  });

  it("rejects a major examination title that contradicts its selected type", () => {
    const mismatch = examSchema.safeParse({ ...base, title: "2nd Term", exam_type: "first_term" });
    expect(mismatch.success).toBe(false);
    expect(examSchema.safeParse({ ...base, title: "2nd Term", exam_type: "second_term" }).success).toBe(true);
  });
});
