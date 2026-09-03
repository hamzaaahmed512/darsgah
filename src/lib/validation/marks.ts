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

/** Exam types that require principal approval and appear in result workflows. */
export const specialExamTypes = ["monthly", "first_term", "second_term", "third_term"] as const;

/** The four exam types selectable when "Examination" category is chosen in the UI. */
export const examinationExamTypes = ["monthly", "first_term", "second_term", "third_term"] as const;
export type ExaminationExamType = (typeof examinationExamTypes)[number];

/** Human-readable labels for Examination exam types — also used as auto-derived title. */
export const examinationTypeLabels: Record<ExaminationExamType, string> = {
  monthly: "Monthly Test",
  first_term: "1st Term",
  second_term: "2nd Term",
  third_term: "3rd Term"
};

// ─── Discriminated Union Schema ───────────────────────────────────────────────

const generalAssessmentSchema = z.object({
  assessment_category: z.literal("general"),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  /** Free-form title provided by the user (e.g. "Quiz 1", "Assignment"). */
  title: z.string().trim().min(2, "Title is required").max(120),
  /** Fixed to "quiz" for general assessments; stored in DB but not shown to user. */
  exam_type: z.literal("quiz").default("quiz"),
  /** Hidden from UI — sent as empty string to satisfy DB column. */
  term: z.string().trim().max(80).default(""),
  /** Always null for general assessments. */
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  exam_date: z.string().date(),
  max_marks: z.coerce.number().positive("Max marks must be greater than zero").max(1000)
});

const examinationSchema = z.object({
  assessment_category: z.literal("examination"),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  /** Explicitly selected by the user from the 4 examination types. */
  exam_type: z.enum(examinationExamTypes, { required_error: "Examination type is required" }),
  /** Auto-derived from exam_type label; not collected from the UI. */
  title: z.string().trim().max(120).default(""),
  /** Hidden from UI — sent as empty string to satisfy DB column. */
  term: z.string().trim().max(80).default(""),
  /** Always null — month selector is removed from the UI. */
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  exam_date: z.string().date(),
  max_marks: z.coerce.number().positive("Max marks must be greater than zero").max(1000)
});

export const examSchema = z
  .discriminatedUnion("assessment_category", [generalAssessmentSchema, examinationSchema])
  .transform((value) => {
    if (value.assessment_category === "examination") {
      // Auto-derive title from the selected exam type label
      return {
        ...value,
        title: examinationTypeLabels[value.exam_type] ?? String(value.exam_type),
        month: null
      };
    }
    // General assessment: clear month (not collected from UI)
    return { ...value, month: null };
  });

// ─── Mark Entry & Approval ────────────────────────────────────────────────────

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

export type ExamFormValues = z.input<typeof examSchema>;
export type ParsedExamValues = z.output<typeof examSchema>;
export type MarkEntryValues = z.infer<typeof markEntrySchema>;
