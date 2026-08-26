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

export type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;
export type LeaveReviewValues = z.infer<typeof leaveReviewSchema>;
