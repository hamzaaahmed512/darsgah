import { describe, expect, it } from "vitest";
import { resolveChallanAmount } from "@/lib/services/finance";

describe("resolveChallanAmount", () => {
  it("uses the generated challan amount when it is positive", () => {
    expect(resolveChallanAmount({ amount: 4200, student_fee_accounts: { total_payable: 5000 } })).toBe(4200);
  });

  it("falls back to the current payable balance when generated amount is zero", () => {
    expect(resolveChallanAmount({ amount: 0, student_fee_accounts: { total_payable: 5000 } })).toBe(5000);
  });
});
