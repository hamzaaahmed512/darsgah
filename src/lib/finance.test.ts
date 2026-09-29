import { describe, expect, it } from "vitest";
import { allocatePaymentsToChallans, calculateFeeAccountAmounts, normalizeStudentFeeStatus, resolveChallanAmount } from "@/lib/services/finance";

describe("resolveChallanAmount", () => {
  it("uses the generated challan amount when it is positive", () => {
    expect(resolveChallanAmount({ amount: 4200, student_fee_accounts: { total_payable: 5000 } })).toBe(4200);
  });

  it("falls back to the current payable balance when generated amount is zero", () => {
    expect(resolveChallanAmount({ amount: 0, student_fee_accounts: { total_payable: 5000 } })).toBe(5000);
  });
});

describe("normalizeStudentFeeStatus", () => {
  it("marks a partly paid cumulative bill as partially paid", () => {
    expect(normalizeStudentFeeStatus({
      total_payable: 5000,
      amount_paid: 3000,
      pending_challan_amount: 5000
    })).toBe("partially_paid");
  });
});

describe("calculateFeeAccountAmounts", () => {
  it("compares cumulative payments with cumulative generated charges", () => {
    expect(calculateFeeAccountAmounts({
      recurringPayable: 20500,
      generatedAmount: 61500,
      amountPaid: 20500
    })).toEqual({ billedAmount: 61500, amountPaid: 20500, remainingBalance: 41000, creditBalance: 0 });
  });

  it("does not produce a negative outstanding balance for historical overpayments", () => {
    expect(calculateFeeAccountAmounts({
      recurringPayable: 15400,
      generatedAmount: 46200,
      amountPaid: 50000
    })).toEqual({ billedAmount: 46200, amountPaid: 50000, remainingBalance: 0, creditBalance: 3800 });
  });

  it("falls back to one recurring charge before any challans are generated", () => {
    expect(calculateFeeAccountAmounts({ recurringPayable: 16400, amountPaid: 0 }))
      .toEqual({ billedAmount: 16400, amountPaid: 0, remainingBalance: 16400, creditBalance: 0 });
  });

  it("rounds currency arithmetic to two decimal places", () => {
    expect(calculateFeeAccountAmounts({ generatedAmount: 100.1, amountPaid: 33.33 }).remainingBalance)
      .toBe(66.77);
  });
});

describe("allocatePaymentsToChallans", () => {
  it("allocates an account payment once, oldest challan first", () => {
    const allocation = allocatePaymentsToChallans([
      { id: "sep", accountId: "account-1", feeMonth: "2026-09-01", amount: 20500, amountPaid: 20500 },
      { id: "aug", accountId: "account-1", feeMonth: "2026-08-01", amount: 20500, amountPaid: 20500 },
      { id: "oct", accountId: "account-1", feeMonth: "2026-10-01", amount: 20500, amountPaid: 20500 }
    ]);

    expect(allocation.get("aug")).toEqual({ billedAmount: 20500, paidAmount: 20500, outstanding: 0 });
    expect(allocation.get("sep")).toEqual({ billedAmount: 20500, paidAmount: 0, outstanding: 20500 });
    expect(allocation.get("oct")).toEqual({ billedAmount: 20500, paidAmount: 0, outstanding: 20500 });
  });

  it("never shares payment money between academic-year accounts", () => {
    const allocation = allocatePaymentsToChallans([
      { id: "old", accountId: "old-account", feeMonth: "2025-09-01", amount: 16000, amountPaid: 16000 },
      { id: "new", accountId: "new-account", feeMonth: "2026-09-01", amount: 20000, amountPaid: 0 }
    ]);

    expect(allocation.get("old")?.outstanding).toBe(0);
    expect(allocation.get("new")?.outstanding).toBe(20000);
  });
});
