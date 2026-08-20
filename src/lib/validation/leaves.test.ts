import { describe, expect, it } from "vitest";
import { leaveReviewSchema } from "@/lib/validation/leaves";

describe("leave review validation", () => {
  it("allows approval without a comment", () => {
    expect(leaveReviewSchema.safeParse({ decision: "approved", principal_remarks: "" }).success).toBe(true);
  });

  it("requires a useful rejection comment", () => {
    expect(leaveReviewSchema.safeParse({ decision: "rejected", principal_remarks: "" }).success).toBe(false);
    expect(leaveReviewSchema.safeParse({ decision: "rejected", principal_remarks: "Insufficient staffing coverage." }).success).toBe(true);
  });
});
