import { describe, expect, it } from "vitest";
import { challanBalance, filterChallans, type Challan, type ChallanPayment } from "./challans";
import { paymentSchema, challanDiscountSchema, challanEditSchema } from "./validation/finance";

const payment = (challan_id: string, amount: number, is_voided = false) => ({ challan_id, amount, is_voided, payment_date: "2026-09-08" } as ChallanPayment);
describe("challan balances", () => {
  it("never credits another challan even for the same student or payment month", () => {
    expect(challanBalance("august", 1000, [payment("september", 1000)])).toEqual({ amount_paid: 0, balance_due: 1000, payment_status: "unpaid" });
  });
  it("credits late payments by ID and excludes voided receipts", () => {
    expect(challanBalance("august", 1000, [payment("august", 400), payment("august", 600, true)]))
      .toEqual({ amount_paid: 400, balance_due: 600, payment_status: "partially_paid" });
  });
  it("settles multiple payments without floating point residuals", () => {
    expect(challanBalance("a", 0.3, [payment("a", 0.1), payment("a", 0.2)]).payment_status).toBe("paid");
  });
  it("preserves zero-value challans as settled", () => {
    expect(challanBalance("a", 0, []).payment_status).toBe("paid");
  });
});

const filters = { q: "", classId: "", session: "", status: "", from: "", to: "" };
const rows = ["paid", "unpaid", "partially_paid"].map((status, i) => ({
  id: `challan-${i}`, student_name: "Ali Khan", admission_number: "ADM-123", class_id: "class-a",
  academic_year_id: "year-a", issue_date: "2026-09-08", payment_status: status
} as Challan));
describe("challan filtering", () => {
  it.each(["paid", "unpaid", "partially_paid"])("keeps %s separate", status => {
    expect(filterChallans(rows, { ...filters, status }).map(r => r.payment_status)).toEqual([status]);
  });
  it("combines search, class, session, and inclusive issue dates", () => {
    expect(filterChallans(rows, { ...filters, q: " adm-123 ", classId: "class-a", session: "year-a", from: "2026-09-08", to: "2026-09-08" })).toHaveLength(3);
    expect(filterChallans(rows, { ...filters, session: "year-b" })).toHaveLength(0);
    expect(filterChallans(rows, { ...filters, from: "2026-09-09" })).toHaveLength(0);
    expect(filterChallans(rows, { ...filters, q: "challan-1" })).toEqual([rows[1]]);
  });
});
describe("challan mutation validation", () => {
  it("rejects account-only payments", () => {
    expect(paymentSchema.safeParse({ student_fee_account_id: "50000000-0000-0000-0000-000000000001", amount: 100, payment_method: "cash" }).success).toBe(false);
  });
  it("rejects invalid discounts and empty line items", () => {
    const updated_at = "2026-09-08T12:00:00+00:00";
    expect(challanDiscountSchema.safeParse({ updated_at, discount_amount: -1, discount_reason: "test" }).success).toBe(false);
    expect(challanEditSchema.safeParse({ updated_at, due_date: "2026-09-30", line_items: [] }).success).toBe(false);
  });
});
