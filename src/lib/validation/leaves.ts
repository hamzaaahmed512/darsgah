import { z } from "zod";

export const leaveRequestSchema = z.object({
  leave_type: z.enum(["casual", "medical", "annual", "unpaid", "other"]),
  start_date: z.string().date("Choose a valid start date"),
  end_date: z.string().date("Choose a valid end date"),
  reason: z.string().trim().min(1, "Reason is required").max(500)
}).refine((value) => value.start_date <= value.end_date, {
  message: "End date must be after the start date",
  path: ["end_date"]
});

export const leaveReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  principal_remarks: z.string().trim().max(500).optional().nullable()
});

export const leavePolicySchema = z.object({
  yearly_limit: z.preprocess(
    (val) => (val === "" || val == null ? null : val),
    z.coerce.number().int("Yearly limit must be an integer").min(0, "Limit cannot be negative").max(365, "Yearly limit cannot exceed 365").nullable()
  ),
  monthly_limit: z.preprocess(
    (val) => (val === "" || val == null ? null : val),
    z.coerce.number().int("Monthly limit must be an integer").min(0, "Limit cannot be negative").max(31, "Monthly limit cannot exceed 31").nullable()
  )
});

export type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;
export type LeaveReviewValues = z.infer<typeof leaveReviewSchema>;
export type LeavePolicyValues = z.infer<typeof leavePolicySchema>;
