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

// ─── Explicit output type ─────────────────────────────────────────────────────
// Defined explicitly rather than inferred from the transform to give TypeScript
// a concrete, non-union shape to work with in the service layer.

export interface ParsedExamValues {
  assessment_category: "general" | "examination";
  class_id: string;
  subject_id: string;
  exam_type: string;
  title: string;
  term: string;
  month: number | null;
  exam_date: string;
  max_marks: number;
}

// ─── Discriminated Union Schema ───────────────────────────────────────────────
// NOTE: z.discriminatedUnion members must be plain ZodObject — not ZodEffects.
// Month validation therefore lives in the outer .superRefine(), not inside
// the examinationSchema branch.

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
  /**
   * Required when exam_type is "monthly"; null for all other examination types.
   * Collected from the UI Month dropdown only when Monthly Test is selected.
   */
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  exam_date: z.string().date(),
  max_marks: z.coerce.number().positive("Max marks must be greater than zero").max(1000)
});

export const examSchema = z
  .discriminatedUnion("assessment_category", [generalAssessmentSchema, examinationSchema])
  // Month validation runs here — AFTER discriminatedUnion (which requires bare ZodObjects).
  .superRefine((value, ctx) => {
    if (value.assessment_category === "examination" && value.exam_type === "monthly" && !value.month) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["month"],
        message: "Please select a month for the monthly test."
      });
    }
  })
  .transform((value): ParsedExamValues => {
    if (value.assessment_category === "examination") {
      return {
        ...value,
        // Auto-derive title from the selected exam type label
        title: examinationTypeLabels[value.exam_type as ExaminationExamType] ?? String(value.exam_type),
        // Preserve month for monthly exams; null for all other examination types
        month: value.exam_type === "monthly" ? (value.month ?? null) : null
      };
    }
    // General assessment: month is never collected from the UI
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
export type MarkEntryValues = z.infer<typeof markEntrySchema>;
