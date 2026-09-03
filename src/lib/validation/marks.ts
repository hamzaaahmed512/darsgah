import { z } from "zod";

export const examTypeSchema = z.enum([
  "quiz",
  "class_test",
  "assignment",
  "presentation",
  "lab",
  "viva",
  "attendance",
  "monthly",
  "first_term",
  "second_term",
  "third_term",
  "mid_term",
  "final_term",
  "pre_board",
  "annual_exam"
]);
export const specialExamTypes = ["monthly", "first_term", "second_term", "third_term"] as const;

export const examSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  exam_type: examTypeSchema,
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  title: z.string().trim().min(2, "Title is required").max(120),
  term: z.string().trim().min(2, "Term is required").max(80),
  exam_date: z.string().date(),
  max_marks: z.coerce.number().positive("Max marks must be greater than zero").max(1000)
}).superRefine((value, context) => {
  if (value.exam_type === "monthly" && !value.month) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["month"], message: "Select a month for a Monthly exam" });
  }
  if (value.exam_type !== "monthly" && value.month) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["month"], message: "Month is only valid for Monthly exams" });
  }

  const normalizedTitle = value.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const titleExamType = /\b(1st|first) term\b/.test(normalizedTitle)
    ? "first_term"
    : /\b(2nd|second) term\b/.test(normalizedTitle)
      ? "second_term"
      : /\b(3rd|third) term\b/.test(normalizedTitle)
        ? "third_term"
        : null;

  if (titleExamType && value.exam_type !== titleExamType) {
    const expectedLabel = titleExamType === "first_term" ? "First Term" : titleExamType === "second_term" ? "Second Term" : "Third Term";
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["exam_type"],
      message: `Assessment type must be ${expectedLabel} because the title is \"${value.title}\".`
    });
  }
});

export const markEntrySchema = z.object({
  exam_id: z.string().uuid(),
  records: z
    .array(
      z.object({
        student_id: z.string().uuid(),
        marks_obtained: z.coerce.number().min(0),
        teacher_comment: z.string().trim().max(240).optional().nullable()
      })
    )
    .min(1, "At least one mark is required")
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  principal_comment: z.string().trim().max(500).optional().nullable()
});

export type ExamFormValues = z.infer<typeof examSchema>;
export type MarkEntryValues = z.infer<typeof markEntrySchema>;
