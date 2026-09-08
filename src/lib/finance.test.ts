import { describe, expect, it } from "vitest";
import { normalizeStudentFeeStatus, resolveChallanAmount } from "@/lib/services/finance";

describe("resolveChallanAmount", () => {
  it("uses the generated challan amount when it is positive", () => {
    expect(resolveChallanAmount({ amount: 4200, student_fee_accounts: { total_payable: 5000 } })).toBe(4200);
  });

  it("falls back to the current payable balance when generated amount is zero", () => {
    expect(resolveChallanAmount({ amount: 0, student_fee_accounts: { total_payable: 5000 } })).toBe(5000);
  });
});

describe("normalizeStudentFeeStatus", () => {
  it("marks a generated unpaid challan as pending when the paid amount is still below the generated challan", () => {
    expect(normalizeStudentFeeStatus({
      total_payable: 5000,
      amount_paid: 3000,
      pending_challan_amount: 5000
    })).toBe("pending");
  });
});
