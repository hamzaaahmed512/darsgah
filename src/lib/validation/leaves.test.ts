import { describe, expect, it } from "vitest";
import { leaveReviewSchema } from "@/lib/validation/leaves";

describe("leave review validation", () => {
  it("allows approval without a comment", () => {
    expect(leaveReviewSchema.safeParse({ decision: "approved", principal_remarks: "" }).success).toBe(true);
  });

  it("allows rejection without a comment", () => {
    expect(leaveReviewSchema.safeParse({ decision: "rejected", principal_remarks: "" }).success).toBe(true);
    expect(leaveReviewSchema.safeParse({ decision: "rejected", principal_remarks: "Insufficient staffing coverage." }).success).toBe(true);
  });
});
